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

define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_login();
global $USER, $DB;

$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);

$DB->get_record('quiz_attempts', [
    'id' => $attemptid,
    'userid' => $USER->id,
    'quiz' => $quizid,
], '*', MUST_EXIST);

$dest = $CFG->dataroot . '/quizproctoring/audio/';
check_dir_exists($dest, true, true);

$timestampsraw = optional_param('timestamps', '[]', PARAM_RAW);
$timestamps = json_decode($timestampsraw, true);
if (!is_array($timestamps)) {
    $timestamps = [];
}

$savedfiles = [];

foreach ($_FILES as $key => $file) {
    if (!preg_match('/^audio\d+$/', $key)) {
        continue;
    }
    if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        continue;
    }

    preg_match('/^audio(\d+)$/', $key, $matches);
    $index = (int) $matches[1];
    $capturetime = isset($timestamps[$index]) ? (int) $timestamps[$index] : time();

    $filename = 'audio_' . $USER->id . '_' . $attemptid . '_' . $index . '_' . $capturetime . '.webm';
    $filename = clean_param($filename, PARAM_FILE);
    if ($filename === '') {
        continue;
    }

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
            'message' => 'Failed to save audio file',
        ]);
        exit;
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
