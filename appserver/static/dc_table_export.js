/*
 * dc_table_export.js - adds an "Export CSV" button to every table panel
 * on a Classic (Simple XML) dashboard. Works for panels that post-process
 * a base search, where Splunk's built-in Export is unavailable.
 *
 * Install: put this file in <app>/appserver/static/ and add
 *   script="dc_table_export.js"
 * to the <dashboard> or <form> root tag of each dashboard.
 */
require([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/simplexml/element/table',
    'splunkjs/mvc/simplexml/ready!'
], function ($, _, mvc, TableElement) {

    // Quote a value for CSV; guard text cells against spreadsheet formula injection.
    function cell(v) {
        if (v === null || v === undefined) { return ''; }
        if (_.isArray(v)) { v = v.join('; '); }
        v = String(v);
        var isNumber = v !== '' && !isNaN(Number(v));
        if (!isNumber && /^[=+\-@]/.test(v)) { v = "'" + v; }
        return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }

    function toCsv(data) {
        var lines = [_.map(data.fields, cell).join(',')];
        _.each(data.rows, function (row) { lines.push(_.map(row, cell).join(',')); });
        return lines.join('\r\n');
    }

    function fileName(title) {
        var base = (title || 'table').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_');
        var stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        return (base || 'table') + '_' + stamp + '.csv';
    }

    function download(text, name) {
        var blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = $('<a>').attr({ href: url, download: name }).css('display', 'none').appendTo('body');
        a[0].click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    }

    function wire(element) {
        if (element.$el.find('.dc-export-bar').length) { return; }
        var managerId = element.settings.get('managerid');
        var manager = managerId && mvc.Components.get(managerId);
        if (!manager) { return; }

        // count: 0 = all rows, not just the page the table shows.
        var results = manager.data('results', { output_mode: 'json_rows', count: 0 });
        var latest = null;
        results.on('data', function () { latest = results.hasData() ? results.data() : null; });
        manager.on('search:start', function () { latest = null; });

        var btn = $('<button type="button" class="btn btn-small">Export CSV</button>');
        var bar = $('<div class="dc-export-bar"></div>')
            .css({ textAlign: 'right', padding: '4px 10px 0' })
            .append(btn);
        element.$el.prepend(bar);

        btn.on('click', function () {
            if (!latest || !latest.rows || !latest.rows.length) {
                alert('No results to export yet. Wait for the table to finish loading.');
                return;
            }
            var title = element.$el.closest('.dashboard-panel').find('.panel-title').first().text()
                || element.$el.find('.panel-head h3').first().text();
            download(toCsv(latest), fileName(title));
        });
    }

    _.each(mvc.Components.getInstances(), function (c) {
        if (c instanceof TableElement) { wire(c); }
    });
});
