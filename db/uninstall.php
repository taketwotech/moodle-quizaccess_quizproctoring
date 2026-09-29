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
 * Proctoring uninstall file.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2025 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Post-uninstall script
 */
function xmldb_quizaccess_quizproctoring_uninstall() {
    global $DB, $USER, $CFG;

    require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

    $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);
    $timestamp = time();

    $record = new stdClass();
    $record->email = $user->email;
    $record->domain = $CFG->wwwroot;
    $postdata = json_encode($record);

    if ($postdata === false) {
        mtrace('Unable to encode ProctorLink uninstall API request.');
        return;
    }

    $key = quizaccess_quizproctoring_get_signing_key();

    if (empty($key)) {
        mtrace('ProctorLink signing key is not configured.');
        return;
    }

    $bodyhash = hash('sha256', $postdata);
    $canonical = $timestamp
        . "\nPOST\n/uninstall\n"
        . $bodyhash;
    $signature = hash_hmac('sha256', $canonical, $key);

    $curl = new \curl();
    $url = 'https://api.proctorlink.com/uninstall';
    $headers = [
        'Content-Type: application/json',
        'x-proctorlink-timestamp: ' . $timestamp,
        'x-proctorlink-signature: ' . $signature,
    ];
    $curl->setHeader($headers);

    try {
        $result = $curl->post($url, $postdata);

        if ($result === false) {
            mtrace('ProctorLink uninstall API request failed.');
        }
    } catch (Exception $exception) {
        mtrace('Error in API during uninstall: ' . $exception->getMessage());
    }
}
