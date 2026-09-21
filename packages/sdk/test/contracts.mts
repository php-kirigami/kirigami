import { reset, registerCommand, getCommand, listCommands, resetCommands, type Command } from '@kirigami/sdk';
import { render, sitemap, runenv, processImages, type PreprosResult } from '@kirigami/php-prepros';
import { getId3Tags } from '@kirigami/audiowaveform-wasm';

interface Host { prefix: string }
registerCommand('hello', { run: (args: string[], project: Host) => project.prefix + args.join(' ') });
const command: Command<Host, string> | null = getCommand<Host, string>('hello');
if (command) await command.run([], { prefix: 'Hello' });
listCommands<Host, string>().forEach(entry => entry.run([], { prefix: '' }));
reset(); reset('prepros:html'); resetCommands(); resetCommands('hello');
// @ts-expect-error A command must provide a callable runner.
registerCommand('bad', { run: 1 });
const result: PreprosResult = await render('_index.php', ['plugin.php']);
result.files?.forEach(file => file.toUpperCase());
const diagnostics: (string | null | undefined)[] = [result.debug, result.stderr, result.warnings, result.page, result.where];
void diagnostics;
await sitemap();
// @ts-expect-error Sitemap takes no directory argument.
await sitemap('src');
await runenv('scripts/task.php', ['data.json'], '--force');
const images = await processImages(); images.files.forEach(file => file.toUpperCase());
const tags = await getId3Tags(new Uint8Array());
if (tags?.title) tags.title.toUpperCase();
