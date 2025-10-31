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
 * Create proctoring report in CSV format.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2025 Mahendra Soni
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../../../config.php');
require_login();
require_once($CFG->libdir . '/filelib.php');

$quizid = required_param('quizid', PARAM_INT);
$cmid = required_param('cmid', PARAM_INT);
$course = required_param('course', PARAM_RAW);

$context = context_module::instance($cmid);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

// Force user's language for translations.
if (!empty($USER->lang)) {
    $curlang = current_language();
    if ($curlang !== $USER->lang) {
        // Temporarily switch to user's language.
        $SESSION->forcelang = $USER->lang;
    }
}

$sql = "SELECT
    mp.attemptid AS pid, u.id, u.firstname, u.lastname, u.username,
    COUNT(CASE WHEN p.status = 'nofacedetected' THEN 1 END) AS noface_count,
    COUNT(CASE WHEN p.status = 'minimizedetected' THEN 1 END) AS minimize_count,
    COUNT(CASE WHEN p.status = 'multifacesdetected' THEN 1 END) AS multifacesdetected,
    COUNT(CASE WHEN p.status = 'nocameradetected' THEN 1 END) AS nocameradetected,
    COUNT(CASE WHEN p.status = 'eyesnotopened' THEN 1 END) AS eyesnotopened,
    COUNT(CASE WHEN p.status IN ('minimizedetected', 'multifacesdetected',
    'nofacedetected', 'nocameradetected', 'eyesnotopened') THEN 1 END) AS totalwarnings
FROM {user} u
JOIN {quizaccess_main_proctor} mp
    ON mp.userid = u.id AND mp.quizid = :quizid1 AND mp.deleted = 0
LEFT JOIN {quizaccess_proctor_data} p
    ON p.userid = u.id AND p.quizid = :quizid2 AND p.deleted = 0 AND mp.attemptid = p.attemptid
WHERE mp.userimg IS NOT NULL AND mp.userimg != ''  AND p.image_status != 'M'
GROUP BY mp.attemptid, u.id, u.firstname, u.lastname, u.username
ORDER BY totalwarnings DESC";

$params = [
    'quizid1' => $quizid,
    'quizid2' => $quizid,
];

$records = $DB->get_records_sql($sql, $params);

$filename = 'proctoring_report_' . $course . '.csv';
$tempdir = make_temp_directory('quizaccess_quizproctoring/reports');
$filepath = $tempdir . '/' . $filename;

$handle = fopen($filepath, 'w');

fputcsv($handle, [
    get_string('csvheader_student', 'quizaccess_quizproctoring'),
    get_string('csvheader_tabswitch', 'quizaccess_quizproctoring'),
    get_string('csvheader_nocamera', 'quizaccess_quizproctoring'),
    get_string('csvheader_noface', 'quizaccess_quizproctoring'),
    get_string('csvheader_noeye', 'quizaccess_quizproctoring'),
    get_string('csvheader_multiface', 'quizaccess_quizproctoring'),
    get_string('csvheader_totalwarnings', 'quizaccess_quizproctoring'),
    get_string('csvheader_starttime', 'quizaccess_quizproctoring'),
    get_string('csvheader_photoslink', 'quizaccess_quizproctoring'),
], ',', '"', '\\');

foreach ($records as $r) {
    $attempt = $DB->get_record('quiz_attempts', [
        'quiz' => $quizid,
        'userid' => $r->id,
        'id' => $r->pid,
    ]);

    $timestart = $attempt ? userdate($attempt->timestart, get_string('strftimedatetime', 'langconfig')) : '-';

    $imagessurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php', [
        'userid' => $r->id,
        'cmid' => $cmid,
        'quizid' => $quizid,
    ]);

    $fullname = $r->firstname . ' ' . $r->lastname . ' (' . $r->username . ')';

    fputcsv($handle, [
        $fullname,
        $r->minimize_count,
        $r->nocameradetected,
        $r->noface_count,
        $r->eyesnotopened,
        $r->multifacesdetected,
        $r->totalwarnings,
        $timestart,
        $imagessurl->out(false),
    ], ',', '"', '\\');
}

fclose($handle);

$fileurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/tempcsvdownload.php', ['filename' => $filename]);

header('Content-Type: application/json');
echo json_encode(['url' => $fileurl->out(false)]);
