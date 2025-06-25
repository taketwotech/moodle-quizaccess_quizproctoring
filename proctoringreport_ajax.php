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

$cmid = required_param('cmid', PARAM_INT);
$quizid = required_param('quizid', PARAM_INT);
$courseid = required_param('courseid', PARAM_INT);

require_login();
$context = context_module::instance($cmid);
$PAGE->set_context($context);
require_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context);

global $DB, $CFG, $OUTPUT;

// DataTables core parameters
$draw = optional_param('draw', 1, PARAM_INT);
$start = optional_param('start', 0, PARAM_INT);
$length = optional_param('length', 10, PARAM_INT);

// Search value (from nested structure)
$searchvalue = '';
if (isset($_POST['search']['value'])) {
    $searchvalue = trim($_POST['search']['value']);
}

// Column mapping
$columns = ['fullname', 'email', 'lastattempt', 'totalimages', 'warnings', 'review', 'actions'];
$ordercolumn = 'u.firstname';
$orderdir = 'ASC';

// Handle ordering from DataTables
if (!empty($_POST['order'][0]['column']) && isset($_POST['order'][0]['dir'])) {
    $colindex = (int) $_POST['order'][0]['column'];
    $orderdir = strtoupper($_POST['order'][0]['dir']) === 'DESC' ? 'DESC' : 'ASC';

    if (isset($columns[$colindex])) {
        switch ($columns[$colindex]) {
            case 'fullname':
                $ordercolumn = 'u.firstname';
                break;
            case 'email':
                $ordercolumn = 'u.email';
                break;
            case 'lastattempt':
                $ordercolumn = 'MAX(mp.timecreated)';
                break;
            case 'totalimages':
                $ordercolumn = '(SELECT COUNT(*) FROM {quizaccess_proctor_data} pd WHERE pd.userid = u.id AND pd.quizid = mp.quizid AND pd.deleted = 0)';
                break;
            case 'warnings':
                $ordercolumn = '(SELECT COUNT(*) FROM {quizaccess_proctor_data} pd WHERE pd.userid = u.id AND pd.quizid = mp.quizid AND pd.deleted = 0 AND pd.status != \'\')';
                break;
            default:
                $ordercolumn = 'u.firstname';
        }
    }
}

$where = "mp.quizid = :quizid AND mp.deleted = 0";
$params = ['quizid' => $quizid];

if (!empty($searchvalue)) {
    $where .= " AND (
        u.firstname LIKE :searchfirstname OR 
        u.lastname LIKE :searchlastname OR 
        u.email LIKE :searchemail
    )";
    $params['searchfirstname'] = "%{$searchvalue}%";
    $params['searchlastname'] = "%{$searchvalue}%";
    $params['searchemail'] = "%{$searchvalue}%";
}

$totalsql = "SELECT COUNT(DISTINCT u.id)
             FROM {user} u
             JOIN {quizaccess_main_proctor} mp ON mp.userid = u.id
             WHERE $where";
$recordsTotal = $DB->count_records_sql($totalsql, $params);

$sql = "
    SELECT 
        u.id,
        u.firstname,
        u.lastname,
        u.email,
        MAX(mp.timecreated) AS lastattempt,
        (
            SELECT COUNT(*) FROM {quizaccess_proctor_data} pd
            WHERE pd.userid = u.id AND pd.quizid = mp.quizid AND pd.deleted = 0
            AND pd.userimg IS NOT NULL AND pd.userimg != '' AND pd.image_status != 'M'
        ) AS totalimages,
        (
            SELECT COUNT(*) FROM {quizaccess_main_proctor} pd
            WHERE pd.userid = u.id AND pd.quizid = mp.quizid AND pd.deleted = 0
            AND pd.userimg IS NOT NULL AND pd.userimg != ''
        ) AS totalmimages,
        (
            SELECT COUNT(*) FROM {quizaccess_proctor_data} pd
            WHERE pd.userid = u.id AND pd.quizid = mp.quizid AND pd.deleted = 0 AND pd.status != ''
        ) AS warnings
    FROM {user} u
    JOIN {quizaccess_main_proctor} mp ON mp.userid = u.id
    WHERE $where
    GROUP BY u.id, u.firstname, u.lastname, u.email
    ORDER BY $ordercolumn $orderdir
";

$records = $DB->get_records_sql($sql, $params, $start, $length);

$data = [];
foreach ($records as $r) {
    $fullname = $r->firstname . ' ' . $r->lastname;
    $namelink = html_writer::link(new moodle_url('/user/view.php', ['id' => $r->id]), $fullname);
    $lastattempt = $r->lastattempt ? userdate($r->lastattempt, get_string('strftimerecent', 'langconfig')) : '-';

    $reviewurl = new moodle_url('/mod/quiz/accessrule/quizproctoring/reviewattempts.php', [
        'userid' => $r->id,
        'cmid' => $cmid,
        'quizid' => $quizid
    ]);
    $reviewicon = html_writer::link($reviewurl, html_writer::empty_tag('img', [
        'src' => $OUTPUT->image_url('review-icon', 'quizaccess_quizproctoring'),
        'class' => 'imageicon',
        'alt' => 'review'
    ]));

    if (is_siteadmin($r->id) || has_capability('moodle/course:update',
            context_course::instance($courseid), $r->id)) {
        $reviewicon = '';
    }

    $deleteicon = html_writer::tag('a', '<i class="icon fa fa-trash"></i>', [
        'href' => '#',
        'class' => 'delete-icon',
        'title' => get_string('delete'),
        'data-cmid' => $cmid,
        'data-quizid' => $quizid,
        'data-userid' => $r->id,
        'data-username' => $fullname
    ]);

    $data[] = [
        'fullname' => $namelink,
        'email' => $r->email,
        'lastattempt' => $lastattempt,
        'totalimages' => $r->totalimages + $r->totalmimages,
        'warnings' => $r->warnings,
        'review' => $reviewicon,
        'actions' => $deleteicon
    ];
}

echo json_encode([
    'draw' => $draw,
    'recordsTotal' => $recordsTotal,
    'recordsFiltered' => $recordsTotal,
    'data' => $data
]);

