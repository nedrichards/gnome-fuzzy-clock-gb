import Gio from 'gi://Gio';
import GnomeDesktop from 'gi://GnomeDesktop';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {buildPanelLabel} from './fuzzyTime.js';

export default class FuzzyClockGbExtension extends Extension {
    enable() {
        this._dateMenu = Main.panel?.statusArea?.dateMenu ?? null;
        this._clockDisplay = this._resolveClockDisplay();
        this._wallClock = this._resolveWallClock();
        this._settings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._signalHandles = [];
        this._isApplyingLabel = false;

        if (!this._clockDisplay || !this._wallClock) {
            console.error(`${this.metadata.uuid}: could not locate a usable GNOME Shell date menu clock`);
            return;
        }

        this._signalHandles.push(
            [this._wallClock, this._wallClock.connect('notify::clock', () => this._syncClockDisplay())],
            [this._clockDisplay, this._clockDisplay.connect('notify::text', () => this._syncClockDisplay())],
            [this._settings, this._settings.connect('changed::clock-show-date', () => this._syncClockDisplay())],
            [this._settings, this._settings.connect('changed::clock-show-weekday', () => this._syncClockDisplay())],
        );

        this._syncClockDisplay();
    }

    disable() {
        for (const [object, signalId] of this._signalHandles ?? []) {
            if (signalId)
                object.disconnect(signalId);
        }

        if (this._clockDisplay && this._wallClock)
            this._clockDisplay.set_text(this._wallClock.clock);

        this._signalHandles = null;
        this._settings = null;
        this._wallClock = null;
        this._clockDisplay = null;
        this._dateMenu = null;
        this._isApplyingLabel = false;
    }

    _resolveClockDisplay() {
        const candidates = [
            this._dateMenu?._clockDisplay ?? null,
            this._dateMenu?.label_actor ?? null,
        ];

        return candidates.find(actor =>
            actor &&
            typeof actor.set_text === 'function' &&
            typeof actor.connect === 'function') ?? null;
    }

    _resolveWallClock() {
        if (this._dateMenu?._clock)
            return this._dateMenu._clock;

        console.log(`${this.metadata.uuid}: dateMenu._clock unavailable, using a fallback GnomeDesktop.WallClock`);
        return new GnomeDesktop.WallClock();
    }

    _syncClockDisplay() {
        if (!this._clockDisplay || !this._settings || this._isApplyingLabel)
            return;

        const nextText = buildPanelLabel(new Date(), {
            showDate: this._settings.get_boolean('clock-show-date'),
            showWeekday: this._settings.get_boolean('clock-show-weekday'),
        });

        if (this._clockDisplay.text === nextText)
            return;

        this._isApplyingLabel = true;
        this._clockDisplay.set_text(nextText);
        this._isApplyingLabel = false;
    }
}
