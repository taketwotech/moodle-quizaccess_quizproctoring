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
 * Save proctoring audio
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2026 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_login();
global $USER, $DB;

$dest = $CFG->dataroot . '/quizproctoring/audio/';
if (!file_exists($dest)) {
    mkdir($dest, 0777, true);
}
$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$timestamps = isset($_POST['timestamps']) ? json_decode($_POST['timestamps'], true) : [];
$savedfiles = [];

foreach ($_FILES as $key => $file) {
    if (!empty($file['tmp_name']) && is_uploaded_file($file['tmp_name'])) {
        preg_match('/audio(\d+)/', $key, $matches);
        $index = isset($matches[1]) ? intval($matches[1]) : null;
        $capturetime = ($index !== null && isset($timestamps[$index])) ? intval($timestamps[$index]) : time();

        $filename = 'audio_' . $USER->id . '_' . $capturetime . '_' . $key . '.webm';
        $filepath = $dest . $filename;

        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            $record = new stdClass();
            $record->quizid = $quizid;
            $record->userid = $USER->id;
            $record->attemptid = $attemptid;
            $record->audioname = $filename;
            $record->timecreated = $capturetime;
            $DB->insert_record('quizaccess_proctor_audio', $record);
            $savedfiles[] = $filename;
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => "Failed to move file for key $key",
            ]);
            exit;
        }
    }
}

if (!empty($savedfiles)) {
    echo json_encode([
        'status' => 'success',
        'files' => $savedfiles,
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'No valid audio files received',
    ]);
}
