import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPanelLabel, fuzzyWords, numberWords} from '../fuzzyTime.js';

test('numberWords preserves the Android phrasing', () => {
    assert.equal(numberWords(0), 'Zero');
    assert.equal(numberWords(5), 'Five');
    assert.equal(numberWords(10), 'Ten');
    assert.equal(numberWords(15), 'Fifteen');
    assert.equal(numberWords(20), 'Twenty');
    assert.equal(numberWords(25), 'Twenty-five');
});

test('fuzzyWords handles representative boundaries', () => {
    assert.equal(fuzzyWords(0, 0), 'Midnight');
    assert.equal(fuzzyWords(0, 3), 'Five Past Midnight');
    assert.equal(fuzzyWords(0, 8), 'Ten Past Midnight');
    assert.equal(fuzzyWords(0, 13), 'Quarter Past Midnight');
    assert.equal(fuzzyWords(0, 28), 'Half Midnight');
    assert.equal(fuzzyWords(0, 33), 'Twenty-five To One');
    assert.equal(fuzzyWords(0, 43), 'Quarter To One');
    assert.equal(fuzzyWords(0, 58), 'One O\'Clock');
    assert.equal(fuzzyWords(11, 58), 'Noon');
    assert.equal(fuzzyWords(12, 58), 'One O\'Clock');
    assert.equal(fuzzyWords(23, 58), 'Midnight');
});

test('buildPanelLabel places the fuzzy time before the date', () => {
    const date = new Date('2026-04-23T12:33:00');

    assert.equal(buildPanelLabel(date, {showDate: false, showWeekday: false}), 'Twenty-five To One');
    assert.equal(buildPanelLabel(date, {showDate: false, showWeekday: true}), 'Twenty-five To One on Thursday');
    assert.equal(buildPanelLabel(date, {showDate: true, showWeekday: false}), 'Twenty-five To One on 23 April');
    assert.equal(buildPanelLabel(date, {showDate: true, showWeekday: true}), 'Twenty-five To One on Thursday 23 April');
    assert.equal(buildPanelLabel(date, {showDate: true, showWeekday: true, locale: 'en-US'}), 'Twenty-five To One on Thursday, April 23');
});

test('buildPanelLabel keeps weekday-only output clean', () => {
    const date = new Date('2026-04-23T18:30:00');

    assert.equal(buildPanelLabel(date, {showDate: false, showWeekday: true, locale: 'en-GB'}), 'Half Six on Thursday');
    assert.equal(buildPanelLabel(date, {showDate: false, showWeekday: false, locale: 'en-GB'}), 'Half Six');
});

test('buildPanelLabel rolls the date forward when fuzzy time crosses midnight', () => {
    const late = new Date('2026-04-23T23:58:00');
    const early = new Date('2026-04-24T00:03:00');

    assert.equal(buildPanelLabel(late, {showDate: true, showWeekday: false}), 'Midnight on 24 April');
    assert.equal(buildPanelLabel(late, {showDate: true, showWeekday: true}), 'Midnight on Friday 24 April');
    assert.equal(buildPanelLabel(early, {showDate: true, showWeekday: true, locale: 'en-GB'}), 'Five Past Midnight on Friday 24 April');
});
