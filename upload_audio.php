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
require_once(__DIR__ . '/compat.php');
require_login();
global $USER, $DB;

$attemptid = required_param('attemptid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);

$proctorsettings = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $quizid]);
if (empty($proctorsettings) || empty($proctorsettings->enablerecordaudio)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Audio recording is not enabled',
    ]);
    exit;
}

$attempt = $DB->get_record('quiz_attempts', [
    'id' => $attemptid,
    'userid' => $USER->id,
    'quiz' => $quizid,
], '*', MUST_EXIST);

$allowedstates = [\mod_quiz\quiz_attempt::IN_PROGRESS, \mod_quiz\quiz_attempt::FINISHED];
if (!in_array($attempt->state, $allowedstates, true)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Attempt is not open for uploads',
    ]);
    exit;
}
if ($attempt->state === \mod_quiz\quiz_attempt::FINISHED) {
    $grace = 5 * MINSECS;
    $finishedat = max((int) $attempt->timefinish, (int) $attempt->timemodified);
    if ($finishedat > 0 && (time() - $finishedat) > $grace) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Attempt upload window has closed',
        ]);
        exit;
    }
}

$dest = $CFG->dataroot . '/quizproctoring/audio/';
check_dir_exists($dest, true, true);

/**
 * True when the file is a complete WebM, Ogg, or MP4/M4A container.
 *
 * @param string $pathname Temp upload path
 * @return bool
 */
function quizproctoring_upload_audio_is_playable($pathname) {
    if (!is_readable($pathname)) {
        return false;
    }
    $size = filesize($pathname);
    if ($size === false || $size < 1024) {
        return false;
    }
    $handle = fopen($pathname, 'rb');
    if (!$handle) {
        return false;
    }
    $header = fread($handle, 8);
    fclose($handle);
    if ($header === false || strlen($header) < 4) {
        return false;
    }
    // WebM / EBML.
    if (substr($header, 0, 4) === "\x1A\x45\xDF\xA3") {
        return true;
    }
    // Ogg.
    if (substr($header, 0, 4) === 'OggS') {
        return true;
    }
    // MP4 / M4A ftyp box.
    return strlen($header) >= 8 && substr($header, 4, 4) === 'ftyp';
}

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
    if (!quizproctoring_upload_audio_is_playable($file['tmp_name'])) {
        continue;
    }

    preg_match('/^audio(\d+)$/', $key, $matches);
    $index = (int) $matches[1];
    $capturetime = isset($timestamps[$index]) ? (int) $timestamps[$index] : time();

    $clientname = isset($file['name']) ? strtolower(pathinfo($file['name'], PATHINFO_EXTENSION)) : '';
    $safeext = in_array($clientname, ['webm', 'm4a', 'ogg', 'mp4', 'aac'], true) ? $clientname : 'webm';
    $filename = 'audio_' . $USER->id . '_' . $attemptid . '_' . $index . '_' . $capturetime . '.' . $safeext;
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
