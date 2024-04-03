<?php
defined('MOODLE_INTERNAL') || die();
function xmldb_quizaccess_quizproctoring_install() {
    global $CFG, $DB;

    set_config('enablemobilewebservice', true);
    set_config('enablewebservices', true);
    set_config('webserviceprotocols', 'xmlrpc,rest');

    $system_context = context_system::instance();
    $userRole = $DB->get_record('role', array('shortname' => 'user'));
    if ($userRole) {
        assign_capability('webservice/xmlrpc:use', CAP_ALLOW, $userRole->id, $system_context->id, true);
        assign_capability('webservice/rest:use', CAP_ALLOW, $userRole->id, $system_context->id, true);
        assign_capability('moodle/webservice:createtoken', CAP_ALLOW, $userRole->id, $system_context->id, true);
    }
}