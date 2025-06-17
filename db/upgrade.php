<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Proctoring upgrade file.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Quiz module upgrade function.
 * @param string $oldversion the version we are upgrading from.
 */
function xmldb_quizaccess_quizproctoring_upgrade($oldversion) {
    global $CFG, $DB, $USER, $SESSION;

    $dbman = $DB->get_manager();

    if ($oldversion < 2020092406) {

        // Define field deleted to be added to quizaccess_proctor_data.
        $table = new xmldb_table('quizaccess_proctor_data');
        $field = new xmldb_field('deleted', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'attemptid');

        // Conditionally launch add field deleted.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Proctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2020092406, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2020092407) {

        // Define field triggeresamail to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('triggeresamail', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'time_interval');

        // Conditionally launch add field triggeresamail.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Proctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2020092407, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2020092408) {

        // Define field warning_threshold to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('warning_threshold', XMLDB_TYPE_INTEGER, '2', null, null, null, null, 'triggeresamail');

        // Conditionally launch add field warning_threshold.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Define field status to be added to quizaccess_proctor_data.
        $table = new xmldb_table('quizaccess_proctor_data');
        $field = new xmldb_field('status', XMLDB_TYPE_CHAR, '100', null, null, null, null, 'deleted');

        // Conditionally launch add field status.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Proctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2020092408, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2020092409) {

        // Define field ci_test_id to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('ci_test_id', XMLDB_TYPE_INTEGER, '20', null, null, null, null, 'warning_threshold');

        // Conditionally launch add field ci_test_id.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Proctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2020092409, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2020092410) {

        // Define field quiz_sku to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('quiz_sku', XMLDB_TYPE_CHAR, '100', null, null, null, null, 'ci_test_id');

        // Conditionally launch add field quiz_sku.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Proctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2020092410, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2021060400) {

        // Define field quiz_sku to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('proctoringvideo_link', XMLDB_TYPE_TEXT, '', null, null, null, null, 'quiz_sku');

        // Conditionally launch add field quiz_sku.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Proctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2021060400, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2021060401) {

        // Define index quizid-enableproctoring (unique) to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $index = new xmldb_index('quizid-enableproctoring', XMLDB_INDEX_UNIQUE, ['quizid', 'enableproctoring']);

        // Conditionally launch add index quizid-enableproctoring.
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Define index quizid-attemptid-userid-image_status-status (not unique) to be added to quizaccess_proctor_data.
        $table = new xmldb_table('quizaccess_proctor_data');
        $index = new xmldb_index('quizid-attemptid-userid-image_status-status',
            XMLDB_INDEX_NOTUNIQUE, ['quizid', 'attemptid', 'userid', 'image_status', 'status']);

        // Conditionally launch add index quizid-attemptid-userid-image_status-status.
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Proctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2021060401, 'quizaccess', 'quizproctoring');

    }

    if ($oldversion < 2023031600) {

        // Define field triggeresamail to be dropped from quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('triggeresamail');

        // Conditionally launch drop field triggeresamail.
        if ($dbman->field_exists($table, $field)) {
            $dbman->drop_field($table, $field);
        }

        // Define field ci_test_id to be dropped from quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('ci_test_id');

        // Conditionally launch drop field ci_test_id.
        if ($dbman->field_exists($table, $field)) {
            $dbman->drop_field($table, $field);
        }

        // Define field quiz_sku to be dropped from quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('quiz_sku');

        // Conditionally launch drop field quiz_sku.
        if ($dbman->field_exists($table, $field)) {
            $dbman->drop_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2023031600, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2024020251) {

        // Define field enableteacherproctor to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('enableteacherproctor', XMLDB_TYPE_INTEGER, '1',
         null, XMLDB_NOTNULL, null, '0', 'proctoringvideo_link');

        // Conditionally launch add field enableteacherproctor.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2024020251, 'quizaccess', 'quizproctoring');
    }
    
    if ($oldversion < 2024092404) {

        // Define field isautosubmit to be added to quizaccess_proctor_data.
        $table = new xmldb_table('quizaccess_proctor_data');
        $field = new xmldb_field('isautosubmit', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'status');

        // Conditionally launch add field isautosubmit.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2024092404, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2024102700) {

        // Update img_check_time to 30 for all instances in quizaccess_quizproctoring.
        $DB->set_field('config_plugins', 'value', '30', [
            'plugin' => 'quizaccess_quizproctoring',
            'name' => 'img_check_time',
        ]);

        // Update proctoring_image_show to 1 for all instances in quizaccess_quizproctoring.
        $DB->set_field('config_plugins', 'value', '1', [
            'plugin' => 'quizaccess_quizproctoring',
            'name' => 'proctoring_image_show',
        ]);

        // Update the plugin savepoint.
        upgrade_plugin_savepoint(true, 2024102700, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2024102910) {

        // Define field storeallimages to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('storeallimages', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'enableteacherproctor');

        // Conditionally launch add field storeallimages.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2024102910, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2024102911) {

        // Define field enableprofilematch to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('enableprofilematch', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'storeallimages');

        // Conditionally launch add field enableprofilematch.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2024102911, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2024103002) {

        // Define field enablestudentvideo to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('enablestudentvideo', XMLDB_TYPE_INTEGER, '1',
            null, XMLDB_NOTNULL, null, '0', 'enableprofilematch');

        // Conditionally launch add field enablestudentvideo.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2024103002, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025010600) {
        // Update the default value for the serviceoption setting.
        set_config('serviceoption', 'take2', 'quizaccess_quizproctoring');

        // Update the plugin version to mark the change as complete.
        upgrade_plugin_savepoint(true, 2025010600, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025040201) {

        // Define field enableeyecheck to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('enableeyecheck', XMLDB_TYPE_INTEGER, '1', null, null, null, '0', 'proctoringvideo_link');

        // Conditionally launch add field enableeyecheck.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025040201, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025041402) {

        // Define field response to be added to quizaccess_proctor_data.
        $table = new xmldb_table('quizaccess_proctor_data');
        $field = new xmldb_field('response', XMLDB_TYPE_CHAR, '1000', null, null, null, null, 'isautosubmit');

        // Conditionally launch add field response.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025041402, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025042301) {
        $timestamp = time();
        $randombytes = random_bytes(8);
        $hexstringwithtimestamp = bin2hex($randombytes) . '_' . $timestamp;;
        set_config('quizproctoringhexstring', $hexstringwithtimestamp, 'quizaccess_quizproctoring');

        upgrade_plugin_savepoint(true, 2025042301, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025042904) {

        // Define field enableeyecheckreal to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('enableeyecheckreal', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'enableeyecheck');

        // Conditionally launch add field enableeyecheckreal.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025042904, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025052801) {

        $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);
        $plugin = core_plugin_manager::instance()->get_plugin_info('quizaccess_quizproctoring');
        $release = $plugin->release;

        $record = new stdClass();
        $record->firstname = $user->firstname;
        $record->lastname  = $user->lastname;
        $record->email     = $user->email;
        $record->domain    = $CFG->wwwroot;
        $record->moodle_v  = get_config('moodle', 'release');
        $record->previously_installed_v = '(Build: '. $oldversion.')';
        $record->proctorlink_version = $release;
        $SESSION->proctorlink_version = $release;

        $postdata = json_encode($record);

        $curl = new \curl();
        $url = 'https://proctoring.taketwotechnologies.com/create';
        $header = [
            'Content-Type: application/json',
        ];
        $curl->setHeader($header);
        $result = $curl->post($url, $postdata);

        upgrade_plugin_savepoint(true, 2025052801, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025061300) {
        $task = new \quizaccess_quizproctoring\task\images_adhoc_task();
        $task->set_component('quizaccess_quizproctoring');
        
        \core\task\manager::queue_adhoc_task($task);

        upgrade_plugin_savepoint(true, 2025061300, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025061601) {

        // Define table quizaccess_main_proctor to be created.
        $table = new xmldb_table('quizaccess_main_proctor');

        // Adding fields to table quizaccess_main_proctor.
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('quizid', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('user_identity', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('userimg', XMLDB_TYPE_TEXT, null, null, null, null, null);
        $table->add_field('image_status', XMLDB_TYPE_CHAR, '1', null, XMLDB_NOTNULL, null, 'M');
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('timemodified', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('aws_response', XMLDB_TYPE_TEXT, null, null, null, null, null);
        $table->add_field('attemptid', XMLDB_TYPE_INTEGER, '11', null, null, null, null);
        $table->add_field('deleted', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('status', XMLDB_TYPE_CHAR, '100', null, null, null, null);
        $table->add_field('isautosubmit', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('response', XMLDB_TYPE_TEXT, null, null, null, null, null);
        $table->add_field('iseyecheck', XMLDB_TYPE_INTEGER, '1', null, null, null, '1');

        // Adding keys to table quizaccess_main_proctor.
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);

        // Adding indexes to table quizaccess_main_proctor.
        $table->add_index('indexing', XMLDB_INDEX_NOTUNIQUE, ['quizid', 'image_status', 'userid', 'deleted', 'status', 'attemptid', 'isautosubmit']);

        // Conditionally launch create table for quizaccess_main_proctor.
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025061601, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025061602) {

        // Define field enableuploadidentity to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('enableuploadidentity', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'enableeyecheck');

        // Conditionally launch add field enableuploadidentity.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025061602, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025061603) {
        $sql = "SELECT * FROM {quizaccess_proctor_data}
                WHERE deleted = 0 AND image_status = 'M'
                ORDER BY id ASC";
        $records = $DB->get_records_sql($sql);

        foreach ($records as $record) {
            $newrecord = new stdClass();
            
            $newrecord->userid = $record->userid;
            $newrecord->quizid = $record->quizid;
            $newrecord->user_identity = $record->user_identity;
            $newrecord->userimg = $record->userimg;
            $newrecord->image_status = $record->image_status;            
            $newrecord->timecreated = $record->timecreated;
            $newrecord->timemodified = $record->timemodified;
            $newrecord->aws_response = $record->aws_response;
            $newrecord->attemptid = $record->attemptid;
            $newrecord->deleted = $record->deleted;
            $newrecord->status = $record->status;
            $newrecord->isautosubmit = $record->isautosubmit;
            $newrecord->response = $record->response;
            
            $DB->insert_record('quizaccess_main_proctor', $newrecord);
        }

        // Mark the upgrade savepoint.
        upgrade_plugin_savepoint(true, 2025061603, 'quizaccess', 'quizproctoring');
    }
    
    return true;
}
