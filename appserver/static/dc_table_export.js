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

    // Pull every row of a table's search. A fresh results model fetches as soon as the
    // search is done (or immediately if it already is), so this does not depend on having
    // caught a 'data' event earlier - tables behind tabs and searches that finished before
    // this script loaded both export correctly.
    function fetchAll(manager, done) {
        var settled = false;
        var model = manager.data('results', { output_mode: 'json_rows', count: 0 });
        function finish(data, err) {
            if (settled) { return; }
            settled = true;
            clearTimeout(timer);
            model.off();
            if (typeof model.destroy === 'function') { model.destroy(); }
            done(data, err);
        }
        model.on('data', function () { finish(model.hasData() ? model.data() : null); });
        model.on('error', function (msg) { finish(null, msg || 'search error'); });
        var timer = setTimeout(function () {
            finish(null, 'timed out - the search may still be running, try again when the table has loaded');
        }, 60000);
    }

    function wire(element) {
        if (!element || !element.$el || element.$el.find('.dc-export-bar').length) { return; }
        var managerId = element.settings.get('managerid');
        if (!managerId || !mvc.Components.get(managerId)) { return; }

        var btn = $('<button type="button" class="btn btn-small">Export CSV</button>');
        var bar = $('<div class="dc-export-bar"></div>')
            .css({ textAlign: 'right', padding: '4px 10px 0' })
            .append(btn);
        element.$el.prepend(bar);

        btn.on('click', function () {
            // Resolve the manager at click time: token changes can rebuild it.
            var manager = mvc.Components.get(element.settings.get('managerid'));
            if (!manager) { alert('This table has no search to export.'); return; }
            var label = btn.text();
            btn.prop('disabled', true).text('Exporting...');
            fetchAll(manager, function (data, err) {
                btn.prop('disabled', false).text(label);
                if (err) { alert('Export failed: ' + err); return; }
                if (!data || !data.rows || !data.rows.length) {
                    alert('This table has no rows to export.');
                    return;
                }
                var title = element.$el.closest('.dashboard-panel').find('.panel-title').first().text()
                    || element.$el.find('.panel-head h3').first().text();
                download(toCsv(data), fileName(title));
            });
        });
    }

    function wireAll() {
        _.each(mvc.Components.getInstances(), function (c) {
            if (c instanceof TableElement) { wire(c); }
        });
    }

    // Tables in rows behind tabs or token conditions can be created after page load,
    // so look again whenever a token changes and for the first minute.
    wireAll();
    _.each(['default', 'submitted'], function (name) {
        var tokens = mvc.Components.get(name);
        if (tokens) { tokens.on('change', function () { _.defer(wireAll); }); }
    });
    var scans = 0;
    var scanTimer = setInterval(function () {
        wireAll();
        if (++scans >= 12) { clearInterval(scanTimer); }
    }, 5000);
});
