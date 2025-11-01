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
 * Show attempts image report
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);

require_once(__DIR__ . '/../../../../config.php');
require_login();

global $DB, $OUTPUT, $PAGE;

$userid = required_param('userid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$cmid = required_param('cmid', PARAM_INT);

$PAGE->set_context(context_module::instance($cmid));

$start = optional_param('start', 0, PARAM_INT);
$length = optional_param('length', 10, PARAM_INT);
$search = optional_param_array('search', [], PARAM_RAW);
$searchval = $search['value'] ?? '';

$context = context_module::instance($cmid);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

$order = $_POST['order'] ?? [];
$columns = [
    'u.email',
    'qa.attempt',
    'qa.timestart',
    'qa.timefinish',
    '(qa.timefinish - qa.timestart)',
    '',
    '',
    'qmp.isautosubmit',
    'qmp.iseyecheck',
    '',
];

$ordercol = 'qa.attempt';
$orderdir = 'DESC';

if (!empty($order[0])) {
    $index = intval($order[0]['column']);
    $dir = strtoupper($order[0]['dir']);
    if (isset($columns[$index]) && in_array($dir, ['ASC', 'DESC']) && $columns[$index] !== '') {
        if ($index === 8) {
            $ordercol = $columns[$index];
            $orderdir = ($dir === 'ASC') ? 'DESC' : 'ASC';
        } else {
            $ordercol = $columns[$index];
            $orderdir = $dir;
        }
    }
}

$params = ['quizid' => $quizid, 'userid' => $userid, 'status' => 'M'];
$wheresql = "WHERE qmp.quizid = :quizid AND qmp.userid = :userid AND qmp.image_status = :status AND qmp.deleted = 0";

if (!empty($searchval)) {
    $wheresql .= " AND (
        CAST(qa.attempt AS CHAR) LIKE :search1 OR
        u.email LIKE :search2
        )";
    $params['search1'] = "%$searchval%";
    $params['search2'] = "%$searchval%";
}

$total = $DB->count_records_sql("
    SELECT COUNT(*)
    FROM {quizaccess_main_proctor} qmp
    JOIN {quiz_attempts} qa ON qa.id = qmp.attemptid
    JOIN {user} u ON u.id = qmp.userid
    $wheresql
", $params);

$sql = "SELECT qmp.*, qa.timestart, qa.timefinish, qa.attempt, u.email, u.username
        FROM {quizaccess_main_proctor} qmp
        JOIN {quiz_attempts} qa ON qa.id = qmp.attemptid
        JOIN {user} u ON u.id = qmp.userid
        $wheresql
        ORDER BY $ordercol $orderdir";

$records = $DB->get_records_sql($sql, $params, $start, $length);

$data = [];
$user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);

foreach ($records as $record) {
    $attempt = (object)[
        'id' => $record->attemptid,
        'timestart' => $record->timestart,
        'timefinish' => $record->timefinish,
        'attempt' => $record->attempt,
    ];

    $namelink = html_writer::link(
        new moodle_url('/user/view.php', ['id' => $user->id]),
        s($record->email)
    );

    $attempturl = html_writer::link(
        new moodle_url('/mod/quiz/review.php', ['attempt' => $attempt->id]),
        s($attempt->attempt)
    );

    $timestart = userdate($attempt->timestart, get_string('strftimerecent', 'langconfig'));
    $finishtime = $timetaken = get_string('inprogress', 'quiz');
    if ($attempt->timefinish) {
        $finishtime = userdate($attempt->timefinish, get_string('strftimerecent', 'langconfig'));
        $timetaken = format_time($attempt->timefinish - $attempt->timestart);
    }

    $pimages = '<img class="imageicon proctoringimage"
        data-attemptid="' . $attempt->id . '"
        data-quizid="' . $quizid . '"
        data-userid="' . $user->id . '"
        data-startdate="' . $timestart . '"
        data-all="false"
        src="' . $OUTPUT->image_url('icon', 'quizaccess_quizproctoring') . '" alt="icon">';

    $pindentity = !empty($record->user_identity) ? '<img class="imageicon proctoridentity"
        data-attemptid="' . $attempt->id . '"
        data-quizid="' . $quizid . '"
        data-userid="' . $user->id . '"
        src="' . $OUTPUT->image_url('identity', 'quizaccess_quizproctoring') . '" alt="icon">' : '';

    $submit = $record->isautosubmit ? '<div class="submittag">Yes</div>' : 'No';
    $submiteye = !$record->iseyecheck ? '<div class="submittag">Yes</div>' : 'No';

    $generate = '<button class="btn btn-warning generate"
        data-attemptid="' . $attempt->id . '"
        data-username="' . s($user->username) . '"
        data-quizid="' . $quizid . '"
        data-userid="' . $user->id . '">' .
        get_string('generate', 'quizaccess_quizproctoring') .
        '</button>';

    $data[] = [$namelink, $attempturl, $timestart, $finishtime, $timetaken, $pimages, $pindentity, $submit, $submiteye, $generate];
}

echo json_encode([
    'draw' => optional_param('draw', 1, PARAM_INT),
    'recordsTotal' => $total,
    'recordsFiltered' => $total,
    'data' => $data,
]);
exit;
