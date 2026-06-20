<?php

// SYS::requireExtension('sqlite3');


class CACHE
{
    const DB_TIMEOUT = 10000;


    private static function db(): SQLite3
    {
        static $db = null;
        if($db !== null) return $db;

        if(!empty($_SERVER['NODE_PROJECT'])) $root = $_SERVER['NODE_PROJECT'] . '/';
        elseif(!empty(PREPROS::$config->root)) $root = rtrim(PREPROS::$config->root, '/') . '/';
        else throw new Exception("Can't find project root.");
        
        if(!is_file(($dbfile = self::getPath()))) $create = true;
        if(!$db = new SQLite3($dbfile)) throw new Exception("Can't open .cache.db.");
        
        $db->busyTimeout(static::DB_TIMEOUT);
        if(!empty($create) && !$db->exec('
            CREATE TABLE "data" (
                "key"        TEXT(128) NOT NULL,
                "val"        TEXT      DEFAULT NULL,
                "inserted_at" INTEGER  NOT NULL DEFAULT 0,
                "ttl"        INTEGER  NOT NULL DEFAULT 0,
                PRIMARY KEY ("key")
            );
            CREATE UNIQUE INDEX "key" ON "data" ("key");
        ')) throw new Exception("Can't create .cache.db.");
        return $db;
    }


    private static function getPath() {
        return '/project/.cache.db';
    }


    public static function get(string $key): mixed
    {
        static $query = null;
        if(!$query) $query = self::db()->prepare(
            "SELECT val FROM data
             WHERE key = ?
               AND (ttl = 0 OR inserted_at + ttl >= :now)"
        );
        $query->bindValue(1, $key, SQLITE3_TEXT);
        $query->bindValue(':now', time(), SQLITE3_INTEGER);
        $result = $query->execute();
        $query->reset();
        if(!$result) return null;
        $row = $result->fetchArray(SQLITE3_ASSOC);
        $result->finalize();
        if($row === false) return null;
        return unserialize($row['val']);
    }


    public static function set(string $key, mixed $val, int $ttl = 0): bool
    {
        static $query = null;
        if(!$query) $query = self::db()->prepare(
            "INSERT OR REPLACE INTO data(key, val, inserted_at, ttl)
             VALUES(?, ?, ?, ?)"
        );
        $query->bindValue(1, $key,           SQLITE3_TEXT);
        $query->bindValue(2, serialize($val), SQLITE3_TEXT);
        $query->bindValue(3, time(),          SQLITE3_INTEGER);
        $query->bindValue(4, $ttl,            SQLITE3_INTEGER);
        $success = (bool)@$query->execute();
        $query->reset();
        PREPROS::exportFile(self::getPath());
        return $success;
    }


    public static function purge(): bool
    {
        PREPROS::exportFile(self::getPath());
        return (bool)self::db()->exec(
            "DELETE FROM data WHERE ttl > 0 AND inserted_at + ttl < " . time()
        );
    }


    public static function delete(string $key): bool
    {
        static $query = null;
        if(!$query) $query = self::db()->prepare("DELETE FROM data WHERE key = ?");
        $query->bindValue(1, $key, SQLITE3_TEXT);
        $success = (bool)@$query->execute();
        $query->reset();
        PREPROS::exportFile(self::getPath());
        return $success;
    }

}