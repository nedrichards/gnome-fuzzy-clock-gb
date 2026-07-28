import Gio from 'gi://Gio';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {buildPanelLabel} from './fuzzyTime.js';

export default class FuzzyClockGbExtension extends Extension {
    enable() {
        this._dateMenu = Main.panel.statusArea.dateMenu;
        this._clockDisplay = this._dateMenu._clockDisplay;
        this._clock = this._dateMenu._clock;
        this._settings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._signalHandles = [];
        this._isApplyingLabel = false;

        this._signalHandles.push(
            [this._clock, this._clock.connect('notify::clock', () => this._syncClockDisplay())],
            [this._clockDisplay, this._clockDisplay.connect('notify::text', () => this._syncClockDisplay())],
            [this._settings, this._settings.connect('changed::clock-show-date', () => this._syncClockDisplay())],
            [this._settings, this._settings.connect('changed::clock-show-weekday', () => this._syncClockDisplay())]
        );

        this._syncClockDisplay();
    }

    disable() {
        for (const [object, signalId] of this._signalHandles ?? []) {
            if (signalId)
                object.disconnect(signalId);
        }

        if (this._clockDisplay && this._clock)
            this._clockDisplay.set_text(this._clock.clock);

        this._signalHandles = null;
        this._settings = null;
        this._clock = null;
        this._clockDisplay = null;
        this._dateMenu = null;
        this._isApplyingLabel = false;
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
