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
 * Proctoring events file.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Post-install script
 */
function xmldb_quizaccess_quizproctoring_install() {
    global $DB, $USER, $CFG, $SESSION;

    require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');
    $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);
    $timestamp = time();
    $randombytes = random_bytes(8);
    $hexstringwithtimestamp = bin2hex($randombytes) . '_' . $timestamp;
    set_config('quizproctoringhexstring', $hexstringwithtimestamp, 'quizaccess_quizproctoring');
    $plugin = core_plugin_manager::instance()->get_plugin_info('quizaccess_quizproctoring');
    $release = $plugin->release;

    $record = new stdClass();
    $record->firstname = $user->firstname;
    $record->lastname  = $user->lastname;
    $record->email     = $user->email;
    $record->domain    = $CFG->wwwroot;
    $record->moodle_v  = get_config('moodle', 'release');
    $record->previously_installed_v = '';
    $record->proctorlink_version = $release;
    $SESSION->proctorlink_version = $release;
    set_config('proctorlink_version', $release, 'quizaccess_quizproctoring');

    $postdata = json_encode($record);

    if ($postdata === false) {
        mtrace('Unable to encode ProctorLink create API request.');
        return;
    }

    // Get signing key from secure configuration.
    $key = quizaccess_quizproctoring_get_signing_key();

    if (empty($key)) {
        mtrace('ProctorLink signing key is not configured.');
        return;
    }

    // Generate HMAC signature.
    $bodyhash = hash('sha256', $postdata);

    $canonical = $timestamp
        . "\nPOST\n/create\n"
        . $bodyhash;

    $signature = hash_hmac(
        'sha256',
        $canonical,
        $key
    );

    $curl = new \curl();

    $url = 'https://api.proctorlink.com/create';

    $headers = [
        'Content-Type: application/json',
        'x-proctorlink-timestamp: ' . $timestamp,
        'x-proctorlink-signature: ' . $signature,
    ];

    $curl->setHeader($headers);

    try {
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

        quizaccess_quizproctoring_sync_plan_from_api();
    } catch (Exception $exception) {
        mtrace('Error in API during install: ' . $exception->getMessage());
    }
}
