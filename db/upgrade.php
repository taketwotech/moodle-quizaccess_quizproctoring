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
        $index = new xmldb_index(
            'quizid-attemptid-userid-image_status-status',
            XMLDB_INDEX_NOTUNIQUE,
            ['quizid', 'attemptid', 'userid', 'image_status', 'status']
        );

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
        $field = new xmldb_field(
            'enableteacherproctor',
            XMLDB_TYPE_INTEGER,
            '1',
            null,
            XMLDB_NOTNULL,
            null,
            '0',
            'proctoringvideo_link'
        );

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
        $field = new xmldb_field(
            'enablestudentvideo',
            XMLDB_TYPE_INTEGER,
            '1',
            null,
            XMLDB_NOTNULL,
            null,
            '0',
            'enableprofilematch'
        );

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
        $hexstringwithtimestamp = bin2hex($randombytes) . '_' . $timestamp;
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

    if ($oldversion < 2025061300) {
        $task = new \quizaccess_quizproctoring\task\images_adhoc_task();
        $task->set_component('quizaccess_quizproctoring');

        \core\task\manager::queue_adhoc_task($task);

        upgrade_plugin_savepoint(true, 2025061300, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025061702) {
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
        $table->add_index('indexing', XMLDB_INDEX_NOTUNIQUE, ['quizid', 'image_status',
            'userid', 'deleted', 'status', 'attemptid', 'isautosubmit']);

        // Conditionally launch create table for quizaccess_main_proctor.
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025061702, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025061703) {
        // Define field enableuploadidentity to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field('enableuploadidentity', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'enableeyecheck');

        // Conditionally launch add field enableuploadidentity.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025061703, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025061704) {
        $task = new \quizaccess_quizproctoring\task\mainImagesTask();
        $task->set_component('quizaccess_quizproctoring');

        \core\task\manager::queue_adhoc_task($task);
        // Mark the upgrade savepoint.
        upgrade_plugin_savepoint(true, 2025061704, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025062401) {
        // Define table quizaccess_proctor_alert to be created.
        $table = new xmldb_table('quizaccess_proctor_alert');

        // Adding fields to table quizaccess_proctor_alert.
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('quizid', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('alertmessage', XMLDB_TYPE_TEXT, null, null, null, null, null);
        $table->add_field('attemptid', XMLDB_TYPE_INTEGER, '11', null, null, null, null);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');

        // Adding keys to table quizaccess_proctor_alert.
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);

        // Conditionally launch create table for quizaccess_proctor_alert.
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025062401, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025070600) {
        // Changing type of field response on table quizaccess_proctor_data to text.
        $table = new xmldb_table('quizaccess_proctor_data');
        $field = new xmldb_field('response', XMLDB_TYPE_TEXT, null, null, null, null, null, 'isautosubmit');

        // Launch change of type for field response.
        $dbman->change_field_type($table, $field);

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025070600, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025120102) {
        // Fetch and update plan information during plugin upgrade.
        require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

        try {
            quizaccess_quizproctoring_sync_plan_from_api();
        } catch (Exception $exception) {
            mtrace('Error in API during upgrade: ' . $exception->getMessage());
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025120102, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025120103) {
        // Define field issubmitbyteacher to be added to quizaccess_main_proctor.
        $table = new xmldb_table('quizaccess_main_proctor');
        $field = new xmldb_field('issubmitbyteacher', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'isautosubmit');

        // Conditionally launch add field issubmitbyteacher.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025120103, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025120104) {
        // Define field iseyedisabledbyteacher to be added to quizaccess_main_proctor.
        $table = new xmldb_table('quizaccess_main_proctor');
        $field = new xmldb_field('iseyedisabledbyteacher', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0', 'iseyecheck');

        // Conditionally launch add field iseyedisabledbyteacher.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025120104, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025120602) {
        // Define field deviceinfo to be added to quizaccess_main_proctor.
        $table = new xmldb_table('quizaccess_main_proctor');
        $field = new xmldb_field('deviceinfo', XMLDB_TYPE_CHAR, '50', null, null, null, null, 'iseyedisabledbyteacher');

        // Conditionally launch add field deviceinfo.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025120602, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025120603) {
        // Define field teacherid to be added to quizaccess_proctor_alert.
        $table = new xmldb_table('quizaccess_proctor_alert');
        $field = new xmldb_field('teacherid', XMLDB_TYPE_INTEGER, '20', null, null, null, null, 'attemptid');

        // Conditionally launch add field teacherid.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025120603, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025120604) {
        // Define field enablerecordaudio to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field(
            'enablerecordaudio',
            XMLDB_TYPE_INTEGER,
            '1',
            null,
            XMLDB_NOTNULL,
            null,
            '0',
            'enableeyecheckreal'
        );

        // Conditionally launch add field enablerecordaudio.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025120604, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2025120605) {
        // Define table quizaccess_proctor_audio to be created.
        $table = new xmldb_table('quizaccess_proctor_audio');

        // Adding fields to table quizaccess_proctor_audio.
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('quizid', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('attemptid', XMLDB_TYPE_INTEGER, '11', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '20', null, XMLDB_NOTNULL, null, '0');
        $table->add_field('audioname', XMLDB_TYPE_CHAR, '100', null, null, null, null);
        $table->add_field('deleted', XMLDB_TYPE_INTEGER, '1', null, XMLDB_NOTNULL, null, '0');

        // Adding keys to table quizaccess_proctor_audio.
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);

        // Conditionally launch create table for quizaccess_proctor_audio.
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2025120605, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026030101) {
        // Define field warningemailtriggered to be added to quizaccess_main_proctor.
        $table = new xmldb_table('quizaccess_main_proctor');
        $field = new xmldb_field(
            'warningemailtriggered',
            XMLDB_TYPE_INTEGER,
            '1',
            null,
            XMLDB_NOTNULL,
            null,
            '0',
            'deviceinfo'
        );

        // Conditionally launch add field warningemailtriggered.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2026030101, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026030102) {
        // Define field warning_email_threshold to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field(
            'warning_email_threshold',
            XMLDB_TYPE_INTEGER,
            '2',
            null,
            null,
            null,
            null,
            'warning_threshold'
        );

        // Conditionally launch add field warning_email_threshold.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2026030102, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026030103) {
        // Rename legacy column alert_message to alertmessage in quizaccess_proctor_alert, if it exists.
        $table = new xmldb_table('quizaccess_proctor_alert');
        $field = new xmldb_field('alert_message', XMLDB_TYPE_TEXT, null, null, null, null, null, 'quizid');

        if ($dbman->field_exists($table, $field)) {
            $dbman->rename_field($table, $field, 'alertmessage');
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2026030103, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026030104) {
        // Define field warning_email_trigger_role to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field(
            'warning_email_trigger_role',
            XMLDB_TYPE_INTEGER,
            '10',
            null,
            null,
            null,
            null,
            'warning_email_threshold'
        );

        // Conditionally launch add field warning_email_trigger_role.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2026030104, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026031000) {
        // Define field enableobjectdetect to be added to quizaccess_quizproctoring.
        $table = new xmldb_table('quizaccess_quizproctoring');
        $field = new xmldb_field(
            'enableobjectdetect',
            XMLDB_TYPE_INTEGER,
            '1',
            null,
            XMLDB_NOTNULL,
            null,
            '0',
            'enablerecordaudio'
        );

        // Conditionally launch add field enableobjectdetect.
        if (!$dbman->field_exists($table, $field)) {
            $dbman->add_field($table, $field);
        }

        // Quizproctoring savepoint reached.
        upgrade_plugin_savepoint(true, 2026031000, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026040901) {
        // Re-sync plan details using the current API display format.
        require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

        try {
            quizaccess_quizproctoring_sync_plan_from_api();
        } catch (Exception $exception) {
            mtrace('Error syncing plan during upgrade: ' . $exception->getMessage());
        }

        upgrade_plugin_savepoint(true, 2026040901, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026040902) {
        $plugin = core_plugin_manager::instance()->get_plugin_info('quizaccess_quizproctoring');
        $release = $plugin->release;
        set_config('proctorlink_version', $release, 'quizaccess_quizproctoring');
        $SESSION->proctorlink_version = $release;

        upgrade_plugin_savepoint(true, 2026040902, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026071200) {
        // Force eye tracking and object detection off for all existing quizzes.
        $DB->set_field('quizaccess_quizproctoring', 'enableeyecheckreal', 0);
        $DB->set_field('quizaccess_quizproctoring', 'enableobjectdetect', 0);

        upgrade_plugin_savepoint(true, 2026071200, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072905) {
        upgrade_plugin_savepoint(true, 2026072905, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072906) {
        upgrade_plugin_savepoint(true, 2026072906, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072907) {
        upgrade_plugin_savepoint(true, 2026072907, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072908) {
        upgrade_plugin_savepoint(true, 2026072908, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072909) {
        upgrade_plugin_savepoint(true, 2026072909, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072910) {
        upgrade_plugin_savepoint(true, 2026072910, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072911) {
        upgrade_plugin_savepoint(true, 2026072911, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072912) {
        upgrade_plugin_savepoint(true, 2026072912, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072913) {
        upgrade_plugin_savepoint(true, 2026072913, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072914) {
        upgrade_plugin_savepoint(true, 2026072914, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072915) {
        upgrade_plugin_savepoint(true, 2026072915, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026072916) {
        upgrade_plugin_savepoint(true, 2026072916, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073000) {
        upgrade_plugin_savepoint(true, 2026073000, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073001) {
        upgrade_plugin_savepoint(true, 2026073001, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073002) {
        upgrade_plugin_savepoint(true, 2026073002, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073003) {
        upgrade_plugin_savepoint(true, 2026073003, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073004) {
        upgrade_plugin_savepoint(true, 2026073004, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073005) {
        upgrade_plugin_savepoint(true, 2026073005, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073006) {
        // Return-to-attempt must not bounce back to summary (shell iframe teardown).
        upgrade_plugin_savepoint(true, 2026073006, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073007) {
        // Avoid about:blank iframe bounce (RequireJS jquery scripterror).
        upgrade_plugin_savepoint(true, 2026073007, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073008) {
        // Return-to-attempt POST leaves bare attempt.php URL — do not send to /my/.
        upgrade_plugin_savepoint(true, 2026073008, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073009) {
        // Prevent stuck loading when leaving secure-window / SEB attempts.
        upgrade_plugin_savepoint(true, 2026073009, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073010) {
        // Recover shell spinner after SEB exit / bfcache restore.
        upgrade_plugin_savepoint(true, 2026073010, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026073011) {
        // Record audio on mobile during live proctoring (mic-only path).
        upgrade_plugin_savepoint(true, 2026073011, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026080500) {
        // Remove unused clear_images config and scheduled deleteStoredImagesTask.
        unset_config('clear_images', 'quizaccess_quizproctoring');
        $DB->delete_records('task_scheduled', [
            'classname' => 'quizaccess_quizproctoring\\task\\deleteStoredImagesTask',
        ]);
        upgrade_plugin_savepoint(true, 2026080500, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026090302) {
        require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

        $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);
        $plugin = core_plugin_manager::instance()->get_plugin_info('quizaccess_quizproctoring');
        $release = $plugin->release;
        $timestamp = time();

        $record = new stdClass();
        $record->firstname = $user->firstname;
        $record->lastname  = $user->lastname;
        $record->email     = $user->email;
        $record->domain    = $CFG->wwwroot;
        $record->moodle_v  = get_config('moodle', 'release');
        $record->previously_installed_v = '(Build: ' . $oldversion . ')';
        $record->proctorlink_version = $release;
        $SESSION->proctorlink_version = $release;
        set_config('proctorlink_version', $release, 'quizaccess_quizproctoring');

        $postdata = json_encode($record);
        $key = quizaccess_quizproctoring_get_signing_key();

        try {
            if ($postdata === false) {
                mtrace('Unable to encode ProctorLink create API request.');
            } else if (empty($key)) {
                mtrace('ProctorLink signing key is not configured.');
            } else {
                $bodyhash = hash('sha256', $postdata);
                $canonical = $timestamp . "\nPOST\n/create\n" . $bodyhash;
                $signature = hash_hmac('sha256', $canonical, $key);

                $curl = new \curl();
                $url = 'https://api.proctorlink.com/create';
                $headers = [
                    'Content-Type: application/json',
                    'x-proctorlink-timestamp: ' . $timestamp,
                    'x-proctorlink-signature: ' . $signature,
                ];
                $curl->setHeader($headers);
                $result = $curl->post($url, $postdata);

                if ($result === false) {
                    mtrace('ProctorLink create API request failed.');
                } else {
                    $response = json_decode($result, true);
                    if (is_array($response)) {
                        quizaccess_quizproctoring_store_create_tokens($response);
                    } else {
                        mtrace('Invalid JSON response from ProctorLink create API.');
                    }
                }
            }

            quizaccess_quizproctoring_sync_plan_from_api();
        } catch (Exception $exception) {
            mtrace('Error in API during upgrade: ' . $exception->getMessage());
        }

        upgrade_plugin_savepoint(true, 2026090302, 'quizaccess', 'quizproctoring');
    }

    if ($oldversion < 2026090501) {
        // Add report indexes for already-installed sites (fresh installs get these from install.xml).
        $reportindexes = [
            'quizaccess_proctor_data' => [
                ['quizid-userid-deleted', ['quizid', 'userid', 'deleted']],
            ],
            'quizaccess_main_proctor' => [
                ['quizid-userid-deleted', ['quizid', 'userid', 'deleted']],
            ],
            'quizaccess_proctor_audio' => [
                ['userid-quizid-deleted', ['userid', 'quizid', 'deleted']],
                ['attemptid-deleted', ['attemptid', 'deleted']],
            ],
            'quizaccess_proctor_alert' => [
                ['quizid-userid-attemptid', ['quizid', 'userid', 'attemptid']],
            ],
        ];

        foreach ($reportindexes as $tablename => $indexes) {
            $table = new xmldb_table($tablename);
            if (!$dbman->table_exists($table)) {
                continue;
            }
            foreach ($indexes as $indexdef) {
                $index = new xmldb_index($indexdef[0], XMLDB_INDEX_NOTUNIQUE, $indexdef[1]);
                if (!$dbman->index_exists($table, $index)) {
                    $dbman->add_index($table, $index);
                }
            }
        }

        upgrade_plugin_savepoint(true, 2026090501, 'quizaccess', 'quizproctoring');
    }

    return true;
}
