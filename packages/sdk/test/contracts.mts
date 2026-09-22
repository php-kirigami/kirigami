import { reset, registerCommand, getCommand, listCommands, resetCommands, registerTaskType, getTaskType, listTaskTypes, resetTaskTypes, type Command, type TaskType } from '@kirigami/sdk';
import { render, sitemap, runenv, processImages, type PreprosResult } from '@kirigami/php-prepros';
import { getId3Tags } from '@kirigami/audiowaveform-wasm';
import { load, Project, type BuildResult, type TaskConfig } from '@kirigami/kirigami';

interface Host { prefix: string }
registerCommand('hello', { run: (args: string[], project: Host) => project.prefix + args.join(' ') });
const command: Command<Host, string> | null = getCommand<Host, string>('hello');
if (command) await command.run([], { prefix: 'Hello' });
listCommands<Host, string>().forEach(entry => entry.run([], { prefix: '' }));
reset(); reset('prepros:html'); resetCommands(); resetCommands('hello');
// @ts-expect-error A command must provide a callable runner.
registerCommand('bad', { run: 1 });
interface FixtureTask { name: string; type: string; value: string }
registerTaskType<FixtureTask, { success: boolean }>('fixture', {
	taskname: 'Fixture',
	canbuild: true,
	validate: (_root, task) => task.value.toUpperCase(),
	run: async (_root, task) => ({ success: !!task.value }),
});
const taskType: TaskType<FixtureTask, { success: boolean }> | null = getTaskType('fixture');
if (taskType) await taskType.run('', { name: 'test', type: 'fixture', value: 'ok' });
listTaskTypes().forEach(entry => entry.name.toUpperCase());
resetTaskTypes(); resetTaskTypes('fixture');
// @ts-expect-error A task type must provide a callable runner.
registerTaskType('bad', { run: 1 });
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
const project: Project = await load();
const buildResult: BuildResult = await project.build();
const configuredTasks: TaskConfig[] = project.tasks;
void buildResult; void configuredTasks;
