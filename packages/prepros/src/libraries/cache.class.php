<?php

SYS::requireExtension('sqlite3');


class CACHE
{
    const DB_TIMEOUT = 10000;


    private static function db()
    {
        static $db = null;
		if($db !== null) return $db;
		if(!empty($_SERVER['NODE_PROJECT'])) $root = $_SERVER['NODE_PROJECT'] . '/';
        elseif(!$root = PXPros::findRoot(__FILE__, true)) throw new Exception("Can't find project root.");
        if(!is_file(($dbfile = $root . '.cache.db'))) $create = true;
        if(!$db = new SQLite3($dbfile)) throw new Exception("Can't open .cache.db.");
        if(!empty($create) && !$db->exec('CREATE TABLE "data" ("key" TEXT(128) NOT NULL, "val" TEXT DEFAULT NULL, PRIMARY KEY ("key")); CREATE UNIQUE INDEX "key" ON "data" ("key");')) throw new Exception("Can't create .cache.db.");
        return $db;
    }


    public static function get(string $key)
    {
        if(!$data = self::db()->querySingle("SELECT val FROM data WHERE key = '" . self::db()->escapeString($key) . "'")) return null;
        else return unserialize($data);
    }


    public static function set(string $key, $val)
    {
        static $query = null;
        if(!$query) $query = self::db()->prepare("INSERT OR REPLACE INTO data(key, val) VALUES(?, ?);");
        $query->bindValue(1, $key, SQLITE3_TEXT);
        $query->bindValue(2, serialize($val), SQLITE3_TEXT);
        if(!self::db()->busyTimeout(static::DB_TIMEOUT)) return false;
        return @$query->execute() ? true : false;
    }

}