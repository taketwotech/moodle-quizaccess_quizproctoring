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
$enableteacherproctor = optional_param('enableteacherproctor', 0, PARAM_INT);
$enableeyecheckreal = optional_param('enableeyecheckreal', 0, PARAM_INT);

$PAGE->set_context(context_module::instance($cmid));

$start = optional_param('start', 0, PARAM_INT);
$length = optional_param('length', 10, PARAM_INT);
$search = optional_param_array('search', [], PARAM_RAW);
$searchval = $search['value'] ?? '';

$context = context_module::instance($cmid);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

$order = $_POST['order'] ?? [];
$columns = [
    'qa.attempt',
    'qa.timestart',
    'qa.timefinish',
    '(qa.timefinish - qa.timestart)',
    '',
    '',
    'qmp.isautosubmit',
    'qa.sumgrades',
    '',
];

if ($enableteacherproctor == 1) {
    $columns[] = 'qmp.issubmitbyteacher';
}

if ($enableeyecheckreal == 1) {
    $columns[] = 'qmp.iseyecheck';
    $columns[] = 'qmp.iseyedisabledbyteacher';
}
$columns[] = '';

$ordercol = 'qa.attempt';
$orderdir = 'DESC';

if (!empty($order[0])) {
    $index = intval($order[0]['column']);
    $dir = strtoupper($order[0]['dir']);
    if (isset($columns[$index]) && in_array($dir, ['ASC', 'DESC']) && $columns[$index] !== '') {
        $eyecheckindex = 9; // Updated index after adding grades column (index 7) and alerts column (index 8).
        if ($enableteacherproctor == 1) {
            $eyecheckindex++;
        }
        if ($enableeyecheckreal == 1 && $index === $eyecheckindex) {
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
        CAST(qa.attempt AS CHAR) LIKE :search1
        )";
    $params['search1'] = "%$searchval%";
}

$total = $DB->count_records_sql("
    SELECT COUNT(*)
    FROM {quizaccess_main_proctor} qmp
    JOIN {quiz_attempts} qa ON qa.id = qmp.attemptid
    JOIN {quiz} q ON q.id = qa.quiz
    JOIN {user} u ON u.id = qmp.userid
    $wheresql
", $params);

$sql = "SELECT qmp.*, qa.timestart, qa.timefinish, qa.attempt, qa.sumgrades,
        q.grade AS maxgrade, q.sumgrades AS maxsumgrades, q.decimalpoints, u.email, u.username
        FROM {quizaccess_main_proctor} qmp
        JOIN {quiz_attempts} qa ON qa.id = qmp.attemptid
        JOIN {quiz} q ON q.id = qa.quiz
        JOIN {user} u ON u.id = qmp.userid
        $wheresql
        ORDER BY $ordercol $orderdir";

$records = $DB->get_records_sql($sql, $params, $start, $length);

$data = [];
$user = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
// Get quiz object once for grade formatting functions.
$quiz = $DB->get_record('quiz', ['id' => $quizid], '*', MUST_EXIST);
require_once($CFG->dirroot . '/mod/quiz/lib.php');

foreach ($records as $record) {
    $attempt = (object)[
        'id' => $record->attemptid,
        'timestart' => $record->timestart,
        'timefinish' => $record->timefinish,
        'attempt' => $record->attempt,
    ];

    // Build attempt link with device info icon if available.
    $deviceinfo = !empty($record->deviceinfo) ? trim($record->deviceinfo) : '';
    $attempttext = s($attempt->attempt);

    if (!empty($deviceinfo)) {
        $deviceinfolower = strtolower(trim($deviceinfo));
        $deviceiconclass = 'fa-desktop';

        if ($deviceinfolower === 'mobile') {
            $deviceiconclass = 'fa-mobile-alt';
        } else if ($deviceinfolower === 'mac ipad') {
            $deviceiconclass = 'fa-tablet-alt';
        } else if ($deviceinfolower === 'mac desktop') {
            $deviceiconclass = 'fa-laptop';
        } else if ($deviceinfolower === 'windows') {
            $deviceiconclass = 'fa-desktop';
        }

        $devicetitle = 'Device: ' . $deviceinfo;
        $deviceicon = ' <i class="icon fa ' . s($deviceiconclass) . ' device-info-icon"
            style="margin-left: 5px; color: #007bff; cursor: pointer; font-size: 0.9em; vertical-align: middle;"
            title="' . s($devicetitle) . '"
            aria-label="' . s($devicetitle) . '"
            role="img"></i>';
        $attempttext .= $deviceicon;
    }
    
    $attempturl = html_writer::link(
        new moodle_url('/mod/quiz/review.php', ['attempt' => $attempt->id]),
        $attempttext
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

    $submit = $record->isautosubmit ? '<div class="submittag">' .
    get_string('yes', 'quizaccess_quizproctoring') . '</div>' :
    get_string('no', 'quizaccess_quizproctoring');

    $eyetoggle = '';
    $submiteye = '';

    if (!$attempt->timefinish) {
        $currenteyestate = $record->iseyecheck ? 1 : 0;

        if ($currenteyestate) {
            $eyetoggle = '<label class="eyetoggle-switch eyetoggle eyeoff-toggle"
                data-cmid="' . $cmid . '"
                data-attemptid="' . $attempt->id . '"
                data-userid="' . $user->id . '"
                data-useremail="' . s($record->email) . '"
                data-action="disable"
                title="' . get_string('eyeoff', 'quizaccess_quizproctoring') . '">
                <input type="checkbox" checked>
                <span class="eyetoggle-slider"></span>
            </label>';
        } else {
            $eyetoggle = '<label class="eyetoggle-switch eyetoggle eyeon-toggle"
                data-cmid="' . $cmid . '"
                data-attemptid="' . $attempt->id . '"
                data-userid="' . $user->id . '"
                data-useremail="' . s($record->email) . '"
                data-action="enable"
                title="' . get_string('eyeon', 'quizaccess_quizproctoring') . '">
                <input type="checkbox">
                <span class="eyetoggle-slider"></span>
            </label>';
        }
        $submiteye = $eyetoggle;
    } else {
        $submiteye = !$record->iseyecheck ? '<div class="submittag">' .
            get_string('disabled', 'quizaccess_quizproctoring') . '</div>' :
            get_string('enabled', 'quizaccess_quizproctoring');
    }

    $generate = '<button class="btn btn-warning generate"
        data-attemptid="' . $attempt->id . '"
        data-username="' . s($user->username) . '"
        data-quizid="' . $quizid . '"
        data-userid="' . $user->id . '">' .
        get_string('generate', 'quizaccess_quizproctoring') .
        '</button>';

    // Format grades/marks using Moodle's standard quiz grade formatting.
    $gradesdisplay = '-';
    if (isset($record->sumgrades) && $record->sumgrades !== null && $attempt->timefinish) {
        $rawgrade = (float)$record->sumgrades;
        $maxsumgrades = (float)($record->maxsumgrades ?? 0);
        $maxgrade = (float)($record->maxgrade ?? 0);
        
        // Calculate scaled grade (same as quiz_rescale_grade).
        if ($maxsumgrades > 0) {
            $scaledgrade = $rawgrade * $maxgrade / $maxsumgrades;
        } else {
            $scaledgrade = 0;
        }
        
        // Format using quiz_format_grade to respect decimal points setting.
        $formattedgrade = quiz_format_grade($quiz, $scaledgrade);
        $formattedmaxgrade = quiz_format_grade($quiz, $maxgrade);
        
        // Display format: scaled grade / max scaled grade (with percentage if max is 100).
        if ($maxgrade > 0) {
            if (abs($maxgrade - 100) < 0.01) {
                // Max grade is 100, show percentage.
                $percentage = format_float($scaledgrade, $quiz->decimalpoints, true, true);
                $gradesdisplay = $formattedgrade . ' / ' . $formattedmaxgrade . ' (' . $percentage . '%)';
            } else {
                // Max grade is not 100, show grade out of max.
                $gradesdisplay = $formattedgrade . ' / ' . $formattedmaxgrade;
            }
        } else {
            $gradesdisplay = $formattedgrade;
        }
    }

    $alerts = $DB->get_records('quizaccess_proctor_alert', [
        'attemptid' => $attempt->id,
        'userid' => $userid,
        'quizid' => $quizid
    ], 'timecreated ASC');
    
    $alertsdisplay = '-';
    if (!empty($alerts)) {
        $alertdata = [];
        foreach ($alerts as $alert) {
            // Skip alerts with null or empty alert_message.
            if (empty($alert->alert_message)) {
                continue;
            }
            $alerttime = userdate($alert->timecreated, get_string('strftimerecent', 'langconfig'));
            $alerttext = s($alert->alert_message);
            $alertdata[] = [
                'message' => $alerttext,
                'time' => $alerttime,
                'timestamp' => $alert->timecreated
            ];
        }
        
        // Only show alert icon if there are valid alerts.
        if (!empty($alertdata)) {
            $alertcount = count($alertdata);
            // Encode alert data for JavaScript.
            $alertdatajson = json_encode($alertdata);
            $warningtext = $alertcount == 1 ? trim(get_string('warning', 'quizaccess_quizproctoring')) : trim(get_string('warnings', 'quizaccess_quizproctoring'));
            $tooltiptext = $alertcount . ' ' . $warningtext;
            $alertsdisplay =
            '<span class="alert-icon-wrapper" style="position: relative; display: inline-block; vertical-align: middle;">' .
                '<i class="icon fa fa-bell alert-icon" ' .
                    'style="color: #dc3545; font-size: 1.2em; cursor: pointer; vertical-align: middle; ' .
                           'transition: color 0.2s;" ' .
                    'data-alerts="' . htmlspecialchars($alertdatajson, ENT_QUOTES, 'UTF-8') . '" ' .
                    'data-attemptid="' . $attempt->id . '" ' .
                    'title="' . s($tooltiptext) . '">' .
                '</i>' .
                '<span class="alert-badge-count" ' .
                      'style="position: absolute; top: -5px; right: -8px; background-color: #dc3545; ' .
                             'color: white; border-radius: 50%; width: 18px; height: 18px; ' .
                             'font-size: 10px; font-weight: bold; display: flex; align-items: center; ' .
                             'justify-content: center; line-height: 1;">' .
                    $alertcount .
                '</span>' .
            '</span>';
        }
    }

    $rowdata = [$attempturl, $timestart, $finishtime, $timetaken,
        $pimages, $pindentity, $submit, $gradesdisplay, $alertsdisplay];

    if ($enableteacherproctor == 1) {
        $submitt = $record->issubmitbyteacher ? '<div class="submittag">' .
        get_string('yes', 'quizaccess_quizproctoring') . '</div>' :
        get_string('no', 'quizaccess_quizproctoring');
        $rowdata[] = $submitt;
    }

    if ($enableeyecheckreal == 1) {
        $rowdata[] = $submiteye;
        $eyedisabledbyteacher = (isset($record->iseyedisabledbyteacher) && $record->iseyedisabledbyteacher) ?
            '<div class="submittag">' . get_string('yes', 'quizaccess_quizproctoring') . '</div>' :
            get_string('no', 'quizaccess_quizproctoring');
        $rowdata[] = $eyedisabledbyteacher;
    }

    $rowdata[] = $generate;
    $data[] = $rowdata;
}

echo json_encode([
    'draw' => optional_param('draw', 1, PARAM_INT),
    'recordsTotal' => $total,
    'recordsFiltered' => $total,
    'data' => $data,
]);
exit;
