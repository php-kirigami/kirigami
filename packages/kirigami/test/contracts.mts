import {
	Kirigami,
	Project,
	load,
	type BuildNotification,
	type BuildResult,
	type ExportResult,
	type TaskConfig,
} from '@kirigami/kirigami';

const project: Project = await load();
const sameProject: Project = await Kirigami.load();
const build: BuildResult = await project.build();
const exported: ExportResult = await project.export({ path: 'dist' });
const tasks: TaskConfig[] = project.tasks;
const server = await project.serve({
	port: 0,
	onBuildResult(event: BuildNotification) {
		event.status.toUpperCase();
	},
});
await server.close();
await project.watch({ initialBuild: false }).then(handle => handle.close());
await project.run('fixture', ['value']);
await project.runTask('custom');
void sameProject; void build; void exported; void tasks;

// @ts-expect-error Port must be numeric.
await project.serve({ port: '4321' });
// @ts-expect-error Script arguments are strings.
await project.run('fixture', [1]);
