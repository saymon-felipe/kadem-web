import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse, compileStyle } from '@vue/compiler-sfc';
import selectorParser from 'postcss-selector-parser';

test('CSS compilado das avaliações altera somente seus controles, preservando as linhas da playlist', () => {
  const source = readFileSync(new URL('../src/components/radio/TrackReaction.vue', import.meta.url), 'utf8');
  const { descriptor } = parse(source);
  const compiled = compileStyle({
    source: descriptor.styles[0].content,
    id: 'data-v-reaction-test',
    scoped: true,
  });
  assert.deepEqual(compiled.errors, []);

  const parents = new Set(['track-row', 'track-title-col', 'title-row', 'meta', 'insights-track', 'player-extra-actions']);
  const checkedParents = new Set();
  compiled.rawResult.root.walkRules((rule) => {
    selectorParser((selectors) => {
      selectors.each((selector) => {
        const parent = selector.nodes.find((node) => node.type === 'class' && parents.has(node.value));
        if (!parent) return;
        checkedParents.add(parent.value);
        const lastCombinator = selector.nodes.findLastIndex((node) => node.type === 'combinator');
        assert.ok(lastCombinator >= 0, `Regra aplicada ao contêiner inteiro: ${selector}`);
        const target = selector.nodes.slice(lastCombinator + 1);
        assert.ok(target.some((node) => node.type === 'attribute' && node.attribute === 'data-v-reaction-test'),
          `Controle sem escopo: ${selector}`);
        assert.ok(target.some((node) => (node.type === 'class' && node.value === 'track-reaction') ||
          (node.type === 'tag' && node.value === 'button')), `Alvo externo às avaliações: ${selector}`);
      });
    }).processSync(rule.selector);
  });
  assert.deepEqual(checkedParents, parents);
});
