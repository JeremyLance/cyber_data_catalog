require([
    'jquery',
    'splunkjs/mvc',
    'splunkjs/mvc/simplexml/ready!'
], function ($, mvc) {
    var service = mvc.createService();
    var APP = 'cyber_data_catalog';
    var ENDPOINT = '/servicesNS/nobody/' + APP + '/admin/dc_github_settings/github';

    function setStatus(msg, isError) {
        var $status = $('#dc-setup-status');
        $status.text(msg);
        $status.css('color', isError ? '#DC4E41' : '#53A051');
    }

    function markConfigured() {
        // Legacy setup.xml used to flip this automatically on save.
        // With a custom setup view we have to do it ourselves so Splunk
        // stops redirecting here on every app launch.
        service.post('/servicesNS/nobody/' + APP + '/configs/conf-app/install',
            { is_configured: 1 },
            function (err) {
                if (err) {
                    console.error('dc_setup: failed to set is_configured=1', err);
                }
            }
        );
    }

    // Show current state on load (handler never returns the real token).
    service.get(ENDPOINT, { output_mode: 'json' }, function (err, response) {
        if (err) {
            setStatus('Could not load current setup state: ' + err.status, true);
            return;
        }
        try {
            var entry = response.data.entry[0].content;
            var hasToken = entry.has_token === '1' || entry.has_token === 'true' || entry.has_token === true;
            setStatus(hasToken
                ? 'A token is currently stored. Leave the field blank and click Save to keep it.'
                : 'No token stored yet.', false);
        } catch (e) {
            setStatus('No token stored yet.', false);
        }
    });

    $('#dc-setup-save').on('click', function () {
        var token = $('#dc-github-token').val();
        var postData = token ? { token: token } : {};

        service.post(ENDPOINT, postData, function (err) {
            if (err) {
                var msg = (err.data && err.data.messages && err.data.messages[0] && err.data.messages[0].text)
                    || err.status;
                setStatus('Save failed: ' + msg, true);
                return;
            }
            $('#dc-github-token').val('');
            setStatus('Saved.', false);
            markConfigured();
        });
    });
});
