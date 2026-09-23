import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('one seo block feeds META tags and the JSON-LD graph', async t => {
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'kiri-seo-'));
    const previous = process.cwd();
    const write = (file, text) => {
        const target = path.join(project, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, text);
    };
    const configure = seo => write('kirigami.yaml', JSON.stringify({
        kirigami: { root: 'src', project: 'Atelier', baseurl: 'https://example.com', description: 'Loose description.' },
        prepros: {},
        ...(seo === undefined ? {} : { seo }),
    }));
    write('src/_index.php', '<?php /** @title Home */ ?><!DOCTYPE html><html><head></head><body><p>home</p></body></html>');
    write('src/about/_index.php', '<?php /** @title About */ ?><!DOCTYPE html><html><head></head><body><p>about</p></body></html>');
    process.chdir(project);
    const api = await import('../index.js');
    t.after(async () => {
        await api.resetRuntime();
        process.chdir(previous);
        fs.rmSync(project, { recursive: true, force: true });
    });
    const renderAbout = async () => {
        await api.resetRuntime();
        const result = await api.render();
        assert.equal(result.success, true, JSON.stringify(result));
        const html = fs.readFileSync('src/about/index.html', 'utf8');
        const script = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        return { html, graph: script ? JSON.parse(script[1])['@graph'] : null };
    };

    await t.test('keys formerly under seo.jsonld are read from seo itself', async () => {
        configure({
            description: 'Shared description.',
            lang: 'fr-CA',
            logo: 'images/logo.png',
            type: 'ProfessionalService',
            person: { name: 'Ada Lovelace', jobTitle: 'Engineer' },
        });
        const { html, graph } = await renderAbout();
        assert.match(html, /<meta name="description" content="Shared description.">/);
        assert.match(html, /<meta property="og:locale" content="fr_CA">/);
        assert.match(html, /<meta property="og:image" content="https:\/\/example.com\/images\/logo.png">/);
        assert.match(html, /<meta name="author" content="Ada Lovelace">/);
        const byType = type => graph.find(node => node['@type'] === type);
        assert.equal(byType('ProfessionalService').description, 'Shared description.');
        assert.equal(byType('Person').jobTitle, 'Engineer');
        assert.equal(byType('WebSite').inLanguage, 'fr-CA');
        assert.ok(byType('BreadcrumbList'));
    });

    await t.test('jsonld: false keeps the META tags and drops only the JSON-LD', async () => {
        configure({ jsonld: false });
        const { html, graph } = await renderAbout();
        assert.match(html, /<meta name="description" content="Loose description.">/);
        assert.equal(graph, null);
    });

    await t.test('without a seo block nothing is injected', async () => {
        configure(undefined);
        const { html, graph } = await renderAbout();
        assert.doesNotMatch(html, /<meta name="description"/);
        assert.equal(graph, null);
    });
});
