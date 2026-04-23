const HOURS = new Map([
    [0, 'Midnight'],
    [1, 'One'],
    [2, 'Two'],
    [3, 'Three'],
    [4, 'Four'],
    [5, 'Five'],
    [6, 'Six'],
    [7, 'Seven'],
    [8, 'Eight'],
    [9, 'Nine'],
    [10, 'Ten'],
    [11, 'Eleven'],
    [12, 'Twelve'],
    [13, 'One'],
    [14, 'Two'],
    [15, 'Three'],
    [16, 'Four'],
    [17, 'Five'],
    [18, 'Six'],
    [19, 'Seven'],
    [20, 'Eight'],
    [21, 'Nine'],
    [22, 'Ten'],
    [23, 'Eleven'],
]);

export function numberWords(num) {
    const ones = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', 'Ten', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const tensVal = Math.floor(num / 10) % 10;
    const onesVal = num % 10;
    const parts = [];

    if (tensVal > 0) {
        if (tensVal === 1 && num !== 10)
            return teens[onesVal];

        if (onesVal > 0)
            return `${tens[tensVal]}-${ones[onesVal].toLowerCase()}`;

        parts.push(tens[tensVal]);
    }

    if (onesVal > 0 || num === 0)
        parts.push(ones[onesVal]);

    return parts.join(' ');
}

export function fuzzyLines(hour, minute) {
    let fuzzyHour = hour;
    let fuzzyMinute = Math.floor((minute + 2) / 5) * 5;

    if (fuzzyMinute > 55) {
        fuzzyMinute = 0;
        fuzzyHour = (fuzzyHour + 1) % 24;
    }

    let prefix = '';
    let targetHour = fuzzyHour;

    if (fuzzyMinute !== 0 && (fuzzyMinute >= 10 || fuzzyMinute === 5 || fuzzyHour === 0 || fuzzyHour === 12)) {
        if (fuzzyMinute === 15) {
            prefix = 'Quarter Past';
        } else if (fuzzyMinute === 45) {
            prefix = 'Quarter To';
            targetHour = (fuzzyHour + 1) % 24;
        } else if (fuzzyMinute === 30) {
            prefix = 'Half';
        } else if (fuzzyMinute < 30) {
            prefix = `${numberWords(fuzzyMinute)} Past`;
        } else {
            prefix = `${numberWords(60 - fuzzyMinute)} To`;
            targetHour = (fuzzyHour + 1) % 24;
        }
    }

    const hourWords = HOURS.get(targetHour);

    if (fuzzyMinute === 0 && targetHour === 12)
        return ['Noon'];

    if (fuzzyMinute === 0 && targetHour !== 0 && targetHour !== 12)
        return [hourWords, "O'Clock"];

    if (prefix)
        return [prefix, hourWords];

    return [hourWords];
}

export function fuzzyWords(hour, minute) {
    return fuzzyLines(hour, minute).join(' ');
}

function roundDateToFuzzyTime(date) {
    const rounded = new Date(date);
    const fuzzyMinute = Math.floor((rounded.getMinutes() + 2) / 5) * 5;

    if (fuzzyMinute > 55)
        rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
    else
        rounded.setMinutes(fuzzyMinute, 0, 0);

    return rounded;
}

function buildDateLabel(date, {showDate = true, showWeekday = false, locale} = {}) {
    const options = {};

    if (showWeekday)
        options.weekday = 'long';

    if (showDate) {
        options.day = 'numeric';
        options.month = 'long';
    }

    if (Object.keys(options).length === 0)
        return '';

    return new Intl.DateTimeFormat(locale, options).format(date);
}

export function buildPanelLabel(date, options = {}) {
    const fuzzyDate = roundDateToFuzzyTime(date);
    const dateLabel = buildDateLabel(fuzzyDate, options);
    const phrase = fuzzyWords(date.getHours(), date.getMinutes());

    return dateLabel ? `${phrase} on ${dateLabel}` : phrase;
}
