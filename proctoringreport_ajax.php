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
 * Show proctoring report ajax
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2024 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define('AJAX_SCRIPT', true);
require_once('../../../../config.php');
require_once($CFG->dirroot . '/mod/quiz/accessrule/quizproctoring/lib.php');

$cmid = required_param('cmid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$courseid = required_param('courseid', PARAM_INT);
$proctoringimageshow = optional_param('proctoringimageshow', 1, PARAM_INT);
$enableaudio = optional_param('enableaudio', 0, PARAM_INT);
$groupid = optional_param('groupid', 0, PARAM_INT);

require_login();
$context = context_module::instance($cmid);
$PAGE->set_context($context);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

global $DB, $CFG, $OUTPUT;

$draw = optional_param('draw', 1, PARAM_INT);
$start = optional_param('start', 0, PARAM_INT);
$defaultlength = quizaccess_quizproctoring_get_reporting_pagination();
$length = optional_param('length', $defaultlength, PARAM_INT);
if (!in_array($length, [10, 25, 50, 100], true)) {
    $length = $defaultlength;
} else {
    quizaccess_quizproctoring_set_reporting_pagination($length);
}

$searchvalue = '';
if (isset($_POST['search']['value'])) {
    $searchvalue = trim($_POST['search']['value']);
}

$columns = ['fullname', 'username', 'email', 'lastattempt', 'totalimages', 'warnings', 'review', 'actions'];
$ordercolumn = 'u.firstname';
$orderdir = 'ASC';
$needfullcounts = false;

if (!empty($_POST['order'][0]['column']) && isset($_POST['order'][0]['dir'])) {
    $colindex = (int) $_POST['order'][0]['column'];
    $orderdir = strtoupper($_POST['order'][0]['dir']) === 'DESC' ? 'DESC' : 'ASC';

    if (isset($columns[$colindex])) {
        switch ($columns[$colindex]) {
            case 'fullname':
                $ordercolumn = 'u.firstname';
                break;
            case 'username':
                $ordercolumn = 'u.username';
                break;
            case 'email':
                $ordercolumn = 'u.email';
                break;
            case 'lastattempt':
                $ordercolumn = 'lastattempt';
                break;
            case 'totalimages':
                $ordercolumn = 'imagetotal';
                $needfullcounts = true;
                break;
            case 'warnings':
                $ordercolumn = 'warnings';
                $needfullcounts = true;
                break;
            default:
                $ordercolumn = 'u.firstname';
        }
    }
}

$searchsql = '';
$params = ['quizid' => $quizid];
$groupjoin = '';

if ($groupid > 0) {
    $group = $DB->get_record('groups', ['id' => $groupid, 'courseid' => $courseid]);
    if ($group) {
        $groupjoin = " JOIN {groups_members} gm ON gm.userid = u.id AND gm.groupid = :groupid ";
        $params['groupid'] = $groupid;
    }
}

if (!empty($searchvalue)) {
    $searchsql = " AND (
        u.username LIKE :searchusername OR
        u.firstname LIKE :searchfirstname OR
        u.lastname LIKE :searchlastname OR
        u.email LIKE :searchemail
    )";
    $params['searchusername'] = "%{$searchvalue}%";
    $params['searchfirstname'] = "%{$searchvalue}%";
    $params['searchlastname'] = "%{$searchvalue}%";
    $params['searchemail'] = "%{$searchvalue}%";
}

$totalsql = "SELECT COUNT(DISTINCT u.id)
             FROM {user} u
             JOIN {quizaccess_main_proctor} mp ON mp.userid = u.id
             $groupjoin
             WHERE mp.quizid = :quizid AND mp.deleted = 0 $searchsql";
$recordstotal = $DB->count_records_sql($totalsql, $params);

if ($needfullcounts) {
    $sql = "
        SELECT
            u.id,
            u.username,
            u.firstname,
            u.lastname,
            u.email,
            mp.lastattempt,
            COALESCE(img.totalimages, 0) AS totalimages,
            COALESCE(mimg.totalmimages, 0) AS totalmimages,
            COALESCE(img.warnings, 0) AS warnings,
            (COALESCE(img.totalimages, 0) + COALESCE(mimg.totalmimages, 0)) AS imagetotal
        FROM {user} u
        JOIN (
            SELECT userid, MAX(timecreated) AS lastattempt
            FROM {quizaccess_main_proctor}
            WHERE quizid = :quizid AND deleted = 0
            GROUP BY userid
        ) mp ON mp.userid = u.id
        LEFT JOIN (
            SELECT userid,
                SUM(CASE WHEN userimg IS NOT NULL AND userimg <> '' AND image_status <> 'M'
                    THEN 1 ELSE 0 END) AS totalimages,
                SUM(CASE WHEN status <> '' AND status <> 'pendingprocessing'
                    THEN 1 ELSE 0 END) AS warnings
            FROM {quizaccess_proctor_data}
            WHERE quizid = :quizidimg AND deleted = 0
            GROUP BY userid
        ) img ON img.userid = u.id
        LEFT JOIN (
            SELECT userid, COUNT(1) AS totalmimages
            FROM {quizaccess_main_proctor}
            WHERE quizid = :quizidmimg AND deleted = 0
              AND userimg IS NOT NULL AND userimg <> ''
            GROUP BY userid
        ) mimg ON mimg.userid = u.id
        $groupjoin
        WHERE 1 = 1 $searchsql
        ORDER BY $ordercolumn $orderdir
    ";
    $params['quizidimg'] = $quizid;
    $params['quizidmimg'] = $quizid;
    $records = $DB->get_records_sql($sql, $params, $start, $length);
} else {
    $sql = "
        SELECT
            u.id,
            u.username,
            u.firstname,
            u.lastname,
            u.email,
            MAX(mp.timecreated) AS lastattempt
        FROM {user} u
        JOIN {quizaccess_main_proctor} mp ON mp.userid = u.id
        $groupjoin
        WHERE mp.quizid = :quizid AND mp.deleted = 0 $searchsql
        GROUP BY u.id, u.username, u.firstname, u.lastname, u.email
        ORDER BY $ordercolumn $orderdir
    ";
    $records = $DB->get_records_sql($sql, $params, $start, $length);

    if (!empty($records)) {
        $userids = array_keys($records);
        [$insql, $inparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'uid');
        $countparams = array_merge(['quizid' => $quizid], $inparams);

        $imgcounts = $DB->get_records_sql("
            SELECT userid,
                SUM(CASE WHEN userimg IS NOT NULL AND userimg <> '' AND image_status <> 'M'
                    THEN 1 ELSE 0 END) AS totalimages,
                SUM(CASE WHEN status <> '' AND status <> 'pendingprocessing'
                    THEN 1 ELSE 0 END) AS warnings
            FROM {quizaccess_proctor_data}
            WHERE quizid = :quizid AND deleted = 0 AND userid $insql
            GROUP BY userid
        ", $countparams);

        $mimgcounts = $DB->get_records_sql("
            SELECT userid, COUNT(1) AS totalmimages
            FROM {quizaccess_main_proctor}
            WHERE quizid = :quizid AND deleted = 0
              AND userimg IS NOT NULL AND userimg <> ''
              AND userid $insql
            GROUP BY userid
        ", $countparams);

        foreach ($records as $userid => $record) {
            $record->totalimages = isset($imgcounts[$userid]) ? (int) $imgcounts[$userid]->totalimages : 0;
            $record->warnings = isset($imgcounts[$userid]) ? (int) $imgcounts[$userid]->warnings : 0;
            $record->totalmimages = isset($mimgcounts[$userid]) ? (int) $mimgcounts[$userid]->totalmimages : 0;
        }
    }
}

$hasaudio = [];
if ($enableaudio && !empty($records)) {
    $userids = array_keys($records);
    [$insql, $inparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED, 'auid');
    $hasaudio = $DB->get_records_sql("
        SELECT DISTINCT userid
        FROM {quizaccess_proctor_audio}
        WHERE quizid = :quizid AND deleted = 0 AND userid $insql
    ", array_merge(['quizid' => $quizid], $inparams));
}

$data = [];
foreach ($records as $r) {
    $fullname = $r->firstname . ' ' . $r->lastname;
    $namelink = html_writer::link(new moodle_url('/user/view.php', ['id' => $r->id]), $fullname);
    $lastattempt = $r->lastattempt ? userdate($r->lastattempt, get_string('strftimerecent', 'langconfig')) : '-';

    $reviewurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php', [
        'userid' => $r->id,
        'cmid' => $cmid,
        'quizid' => $quizid,
    ]);
    $reviewicon = html_writer::link($reviewurl, html_writer::empty_tag('img', [
        'src' => $OUTPUT->image_url('review-icon', 'quizaccess_quizproctoring'),
        'class' => 'imageicon',
        'alt' => 'review',
    ]));

    $deleteicon = html_writer::tag('a', '<i class="icon fa fa-trash"></i>', [
        'href' => '#',
        'class' => 'delete-icon',
        'title' => get_string('delete'),
        'data-cmid' => $cmid,
        'data-quizid' => $quizid,
        'data-userid' => $r->id,
        'data-username' => $fullname,
    ]);

    $rowdata = [
        'fullname' => $namelink,
        'username' => s($r->username),
        'email' => $r->email,
        'lastattempt' => $lastattempt,
        'totalimages' => (int) $r->totalimages + (int) $r->totalmimages,
        'warnings' => (int) $r->warnings,
    ];

    if ($proctoringimageshow == 1) {
        $rowdata['review'] = $reviewicon;
    }
    $rowdata['actions'] = $deleteicon;

    if ($enableaudio) {
        if (!empty($hasaudio[$r->id])) {
            $deleteaicon = html_writer::tag('a', '<i class="icon fa fa-trash"></i>', [
                'href' => '#',
                'class' => 'delete-aicon',
                'title' => get_string('delete'),
                'data-cmid' => $cmid,
                'data-quizid' => $quizid,
                'data-userid' => $r->id,
                'data-username' => $fullname,
            ]);
        } else {
            $deleteaicon = get_string("noaudio", "quizaccess_quizproctoring");
        }
        $rowdata['actionas'] = $deleteaicon;
    }

    $data[] = $rowdata;
}

echo json_encode([
    'draw' => $draw,
    'recordsTotal' => $recordstotal,
    'recordsFiltered' => $recordstotal,
    'data' => $data,
]);
