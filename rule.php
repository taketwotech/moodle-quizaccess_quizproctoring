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
 * Implementaton of the quizaccess_quizproctoring plugin.
 *
 * @package    quizaccess_quizproctoring
 * @subpackage quizproctoring
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


defined('MOODLE_INTERNAL') || die();

require_once($CFG->dirroot . '/mod/quiz/accessrule/accessrulebase.php');


/**
 * A rule representing the safe browser check.
 *
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class quizaccess_quizproctoring extends quiz_access_rule_base {

    /**
     * * Information, such as might be shown on the quiz view page, relating to this restriction.
     * There is no obligation to return anything. If it is not appropriate to tell students
     * about this rule, then just return ''.
     *
     * @param quiz $quizobj quiz object
     * @param int $timenow current time
     * @param bool $canignoretimelimits ignore time limits
     *
     * @return quiz_access_rule_base|quizaccess_proctoring|null
     */
    public static function make(quiz $quizobj, $timenow, $canignoretimelimits) {

        if (!$quizobj->get_quiz()->enableproctoring) {
            return null;
        }
        return new self($quizobj, $timenow);
    }

    /**
     * Get topmost script path.
     *
     * @return string
     */
    public function prevent_access() {
        global $USER;
        $isadmin = is_siteadmin($USER);
        $serviceoption = get_config('quizaccess_quizproctoring', 'serviceoption');
        $url = new moodle_url('/admin/settings.php', ['section' => 'modsettingsquizcatproctoring']);
        $url = $url->out();
        if ($serviceoption == 'AWS') {
            $awskey = get_config('quizaccess_quizproctoring', 'aws_key');
            $awssecret = get_config('quizaccess_quizproctoring', 'aws_secret');
            if (empty($awskey) || empty($awssecret)) {
                if ($isadmin) {
                    return get_string('warningaws', 'quizaccess_quizproctoring', $url);
                } else {
                    return get_string('warningstudent', 'quizaccess_quizproctoring');
                }
            }
        } else {
            $accesstoken = get_config('quizaccess_quizproctoring', 'accesstoken');
            $accesstokensecret = get_config('quizaccess_quizproctoring', 'accesstokensecret');
            if (empty($accesstoken) || empty($accesstokensecret)) {
                if ($isadmin) {
                    return get_string('warningopensourse', 'quizaccess_quizproctoring', $url);
                } else {
                    return get_string('warningstudent', 'quizaccess_quizproctoring');
                }
            }
        }
        if (!$this->check_proctoring()) {
            return get_string('proctoringerror', 'quizaccess_quizproctoring');
        } else {
            return false;
        }
    }

    /**
     * Get description
     *
     * @return String
     */
    public function description() {
        global $OUTPUT, $DB;
        $isadmin = is_siteadmin($USER);
        $id = required_param('id', PARAM_INT);
        $sql = "SELECT cm.* FROM {modules} md JOIN {course_modules} cm ON cm.module = md.id WHERE cm.id = $id";
        $getquiz = $DB->get_record_sql($sql);
        $button = '';
        $context = context_module::instance($id);
        $service = get_config('quizaccess_quizproctoring', 'serviceoption');
        if (($DB->record_exists('quizaccess_quizproctoring', ['quizid' => $getquiz->instance,
            'enableteacherproctor' => 1])) && ($service != 'AWS')) {
            if (has_capability('quizaccess/quizproctoring:quizproctoringonlinestudent', $context)) {
                $button = $OUTPUT->single_button(
                    new moodle_url('/mod/quiz/accessrule/quizproctoring/room.php', [
                        'cmid' => $id,
                        'room' => $getquiz->instance,
                        'teacher' => 'teacher',
                    ]),
                    get_string('viewstudentonline', 'quizaccess_quizproctoring'),
                    'get'
                );
            }
        }
        if (has_capability('quizaccess/quizproctoring:quizproctoringoverallreport', $context)) {
            $button .= $OUTPUT->single_button(
                    new moodle_url('/mod/quiz/accessrule/quizproctoring/proctoringreport.php', [
                        'cmid' => $id,
                        'quizid' => $getquiz->instance,
                    ]),
                    get_string('viewproctoringreport', 'quizaccess_quizproctoring'),
                    'get'
                );
        }
        return get_string('proctoringnotice', 'quizaccess_quizproctoring').$button;
    }

    /**
     * Preflight required form
     *
     * @param int $attemptid attempt id
     * @return bool TRUE|FALSE
     *
     */
    public function is_preflight_check_required($attemptid) {
        global $SESSION, $DB, $USER;
        $user = $DB->get_record('user', ['id' => $USER->id], '*', MUST_EXIST);
        $attemptid = $attemptid ? $attemptid : 0;
        if ($DB->record_exists('quizaccess_proctor_data', ['quizid' => $this->quiz->id,
            'image_status' => 'M', 'userid' => $user->id, 'deleted' => 0, 'status' => '' ])) {
            if ($attemptid) {
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }
    }

    /**
     * Preflight check form
     *
     * @param mod_quiz_preflight_check_form $quizform quiz form
     * @param MoodleQuickForm $mform mform
     * @param int $attemptid attempt id
     * @return String
     *
     */
    public function add_preflight_check_form_fields(mod_quiz_preflight_check_form $quizform,
            MoodleQuickForm $mform, $attemptid) {
        global $PAGE, $DB, $USER;

        $serviceoption = get_config('quizaccess_quizproctoring', 'serviceoption');
        $interval = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $this->quiz->id]);
        $proctoringdata = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $this->quiz->id]);
        $PAGE->requires->js_call_amd('quizaccess_quizproctoring/add_camera',
            'init', [$this->quiz->cmid, true, false, $attemptid, false,
                $this->quiz->id, $serviceoption]);
        if ( $serviceoption != 'AWS' && $proctoringdata->enableprofilematch == 1 ) {
            $context = context_user::instance($USER->id);
            $sql = "SELECT * FROM {files} WHERE contextid =
            :contextid AND component = 'user' AND
            filearea = 'icon' AND itemid = 0 AND
            filepath = '/' AND filename REGEXP 'f[0-9]+\\.(jpg|jpeg|png|gif)$'
            ORDER BY timemodified, filename DESC LIMIT 1";
            $params = ['contextid' => $context->id];
            $filerecord = $DB->get_record_sql($sql, $params);
            if ($filerecord) {
                $fs = get_file_storage();
                $file = $fs->get_file(
                    $filerecord->contextid,
                    $filerecord->component,
                    $filerecord->filearea,
                    $filerecord->itemid,
                    $filerecord->filepath,
                    $filerecord->filename
                );
                $profileimage = $file->get_content();
                $base64image = base64_encode($profileimage);
                $datauri = 'data:image/jpeg;base64,' . $base64image;
            }
            if ($datauri) {
                $mform->addElement('html', get_string('showprofileimage', 'quizaccess_quizproctoring').'
                    <div class="profile-image-wrapper">
                        <img src ="' . $datauri . '" alt = "User Profile Picture" class = "userimage">
                    </div>');
            } else {
                $mform->addElement('static', 'proctoringprofilemsg', '',
                    get_string('showprofileimagemsg', 'quizaccess_quizproctoring'));
            }
        }
        $mform->addElement('static', 'proctoringmessage', '',
                get_string('reqproctormsg', 'quizaccess_quizproctoring'));

        $filemanageroptions = [];
        $filemanageroptions['accepted_types'] = '*';
        $filemanageroptions['maxbytes'] = 0;
        $filemanageroptions['maxfiles'] = 1;
        $filemanageroptions['mainfile'] = true;
        // Video tag.
        $html = html_writer::start_tag('div', ['id' => 'fitem_id_user_video', 'class' => 'form-group row fitem videohtml']);
        $html .= html_writer::div('', 'col-md-3');
        $videotag = html_writer::tag('video', '', ['id' => 'video', 'width' => '320', 'height' => '240', 'autoplay' => 'autoplay']);
        $html .= html_writer::div($videotag, 'col-md-9');
        $html .= html_writer::end_tag('div');

        // Canvas tag.
        $html .= html_writer::start_tag('div', ['id' => 'fitem_id_user_canvas', 'class' => 'form-group row fitem videohtml']);
        $html .= html_writer::div('', 'col-md-3');
        $canvastag = html_writer::tag('canvas', '', ['id' => 'canvas', 'width' => '320', 'height' => '240', 'class' => 'hidden']);
        $html .= html_writer::div($canvastag, 'col-md-9');
        $html .= html_writer::end_tag('div');

        // Take picture button.
        $html .= html_writer::start_tag('div', ['id' => 'fitem_id_user_takepicture', 'class' => 'form-group row fitem']);
        $html .= html_writer::div('', 'col-md-3');
        $button = html_writer::tag('button', get_string('takepicture', 'quizaccess_quizproctoring'),
            ['class' => 'btn btn-primary', 'id' => 'takepicture']);
        $html .= html_writer::div($button, 'col-md-9');
        $html .= html_writer::end_tag('div');

        // Retake button.
        $html .= html_writer::start_tag('div', ['id' => 'fitem_id_user_retake', 'class' => 'form-group row fitem']);
        $html .= html_writer::div('', 'col-md-3');
        $button = html_writer::tag('button', get_string('retake', 'quizaccess_quizproctoring'),
            ['class' => 'btn btn-primary hidden', 'id' => 'retake']);
        $html .= html_writer::div($button, 'col-md-9');
        $html .= html_writer::end_tag('div');

        $mform->addElement('html', $html);
        $mform->addElement('filemanager', 'user_identity', get_string('uploadidentity',
         'quizaccess_quizproctoring'), null, $filemanageroptions);

        // Video button.
        if ($proctoringdata->proctoringvideo_link) {
            $html = html_writer::start_tag('div', ['id' => 'fitem_id_user_demovideo', 'class' => 'form-group row fitem']);
            $html .= html_writer::div('', 'col-md-3');
            $link = html_writer::tag('a', get_string('demovideo', 'quizaccess_quizproctoring'),
                ['id' => 'demovideo', 'target' => '_blank', 'href' => $proctoringdata->proctoringvideo_link]);
            $html .= html_writer::div($link, 'col-md-9');
            $html .= html_writer::end_tag('div');
            $mform->addElement('html', $html);
        }
    }

    /**
     * Valid preflight check
     *
     * @param array $data
     * @param string $files
     * @param string $errors
     * @param int $attemptid
     * @return String
     */
    public function validate_preflight_check($data, $files, $errors, $attemptid) {
        global $USER, $DB, $CFG;
        $useridentity = $data['user_identity'];
        $cmid = $data['cmid'];
        $userimg = $data['userimg'];
        $record = new stdClass();
        $record->user_identity = $useridentity;
        $record->userid = $USER->id;
        $record->quizid = $this->quiz->id;
        $record->userimg = $userimg;
        $attemptid = $attemptid ? $attemptid : 0;
        $record->attemptid = $attemptid;
        // We probably have an entry already in DB.
        $file = file_get_draft_area_info($useridentity);
        if ($rc = $DB->get_record('quizaccess_proctor_data', ['userid' =>
            $USER->id, 'quizid' => $this->quiz->id, 'attemptid' => $attemptid, 'image_status' => 'I' ])) {
            $context = context_module::instance($cmid);
            $rc->image_status = 'M';
            if ($file['filecount'] > 0) {
                $rc->user_identity = $useridentity;
                $DB->update_record('quizaccess_proctor_data', $rc);
                file_save_draft_area_files($useridentity, $context->id, 'quizaccess_quizproctoring', 'identity', $rc->id);
            } else {
                $DB->update_record('quizaccess_proctor_data', $rc);
            }

        } else {
            $id = $DB->insert_record('quizaccess_proctor_data', $record);
            if ($file['filecount'] > 0) {
                $context = context_module::instance($cmid);
                file_save_draft_area_files($useridentity, $context->id, 'quizaccess_quizproctoring', 'identity' , $id);
            }
        }
        return $errors;
    }

    /**
     * Notify preflight check
     *
     * @param int $attemptid
     * @return null
     */
    public function notify_preflight_check_passed($attemptid) {
        global $SESSION;
        $SESSION->proctoringcheckedquizzes[$this->quiz->id] = true;
    }

    /**
     * Checks if required SDK and APIs are available
     *
     * @return true, if browser is safe browser else false
     */
    public function check_proctoring() {
        return true;
    }

    /**
     * Add settings form fields
     *
     * @param mod_quiz_mod_form $quizform quizform
     * @param MoodleQuickForm $mform moodle quicl form
     */
    public static function add_settings_form_fields(mod_quiz_mod_form $quizform, MoodleQuickForm $mform) {
        global $CFG;

        // Allow to enable the access rule only if the Mobile services are enabled.
        $service = get_config('quizaccess_quizproctoring', 'serviceoption');
        $mform->addElement('selectyesno', 'enableproctoring', get_string('enableproctoring', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('enableproctoring', 'enableproctoring', 'quizaccess_quizproctoring');
        $mform->setDefault('enableproctoring', 0);

        if ($service != 'AWS') {
            // Allow admin or teacher to setup proctored quiz.
            $mform->addElement('selectyesno', 'enableteacherproctor',
                get_string('enableteacherproctor', 'quizaccess_quizproctoring'));
            $mform->addHelpButton('enableteacherproctor', 'enableteacherproctor', 'quizaccess_quizproctoring');
            $mform->setDefault('enableteacherproctor', 0);
            $mform->hideIf('enableteacherproctor', 'enableproctoring', 'eq', '0');

            // Allow admin or teacher to capture all images not just warning images.
            $mform->addElement('selectyesno', 'storeallimages',
                get_string('storeallimages', 'quizaccess_quizproctoring'));
            $mform->addHelpButton('storeallimages', 'storeallimages', 'quizaccess_quizproctoring');
            $mform->setDefault('storeallimages', 0);
            $mform->hideIf('storeallimages', 'enableproctoring', 'eq', '0');
            // Allow admin or teacher to setup profile picture match.
            $mform->addElement('selectyesno', 'enableprofilematch',
                get_string('enableprofilematch', 'quizaccess_quizproctoring'));
            $mform->addHelpButton('enableprofilematch', 'enableprofilematch', 'quizaccess_quizproctoring');
            $mform->setDefault('enableprofilematch', 0);
            $mform->hideIf('enableprofilematch', 'enableproctoring', 'eq', '0');
        }

        // Time interval set for proctoring image.
        $mform->addElement('select', 'time_interval', get_string('proctoringtimeinterval', 'quizaccess_quizproctoring'), [
            "5" => get_string('fiveseconds', 'quizaccess_quizproctoring'),
            "10" => get_string('tenseconds', 'quizaccess_quizproctoring'),
            "15" => get_string('fiftenseconds', 'quizaccess_quizproctoring'),
            "20" => get_string('twentyseconds', 'quizaccess_quizproctoring'),
            "30" => get_string('thirtyseconds', 'quizaccess_quizproctoring'),
            "60" => get_string('oneminute', 'quizaccess_quizproctoring'),
            "120" => get_string('twominutes', 'quizaccess_quizproctoring'),
            "180" => get_string('threeminutes', 'quizaccess_quizproctoring'),
            "240" => get_string('fourminutes', 'quizaccess_quizproctoring'),
            "300" => get_string('fiveminutes', 'quizaccess_quizproctoring'),
        ]);
        $mform->setDefault('time_interval', get_config('quizaccess_quizproctoring', 'img_check_time'));
        $mform->hideIf('time_interval', 'enableproctoring', 'eq', '0');

        $thresholds = [];
        for ($i = 0; $i <= 20; $i++) {
            if ($i == 0) {
                $thresholds[$i] = 'Unlimited';
            } else {
                $thresholds[$i] = $i;
            }
        }
        // Allow admin to setup warnings threshold.
        $mform->addElement('select', 'warning_threshold', get_string('warning_threshold',
         'quizaccess_quizproctoring'), $thresholds);
        $mform->addHelpButton('warning_threshold', 'warning_threshold', 'quizaccess_quizproctoring');
        $mform->setDefault('warning_threshold', 0);
        $mform->hideIf('warning_threshold', 'enableproctoring', 'eq', '0');

        $mform->addElement('text', 'proctoringvideo_link', get_string('proctoring_videolink', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('proctoringvideo_link', 'proctoringlink', 'quizaccess_quizproctoring');
    }

    /**
     * Save settings
     *
     * @param stdClass $quiz
     */
    public static function save_settings($quiz) {
        global $DB;
        if (empty($quiz->enableproctoring)) {
            $DB->delete_records('quizaccess_quizproctoring', ['quizid' => $quiz->id]);
            $record = new stdClass();
            $record->quizid = $quiz->id;
            $record->enableproctoring = 0;
            $record->enableteacherproctor = 0;
            $record->enableprofilematch = 0;
            $record->storeallimages = 0;
            $record->time_interval = 0;
            $record->warning_threshold = isset($quiz->warning_threshold) ? $quiz->warning_threshold : 0;
            $record->proctoringvideo_link = $quiz->proctoringvideo_link;
            $DB->insert_record('quizaccess_quizproctoring', $record);
        } else {
            $serviceoption = get_config('quizaccess_quizproctoring', 'serviceoption');
            if ($serviceoption == 'AWS') {
                $enableteacherproctor = 0;
                $enableprofilematch = 0;
                $storeallimages = 0;
            } else {
                $enableteacherproctor = $quiz->enableteacherproctor;
                $enableprofilematch = $quiz->enableprofilematch;
                $storeallimages = $quiz->storeallimages;
            }
            $interval = required_param('time_interval', PARAM_INT);
            $DB->delete_records('quizaccess_quizproctoring', ['quizid' => $quiz->id]);
            $record = new stdClass();
            $record->quizid = $quiz->id;
            $record->enableproctoring = 1;
            $record->enableteacherproctor = $enableteacherproctor;
            $record->enableprofilematch = $enableprofilematch;
            $record->storeallimages = $storeallimages;
            $record->time_interval = $interval;
            $record->warning_threshold = isset($quiz->warning_threshold) ? $quiz->warning_threshold : 0;
            $record->proctoringvideo_link = $quiz->proctoringvideo_link;
            $DB->insert_record('quizaccess_quizproctoring', $record);
        }
    }

    /**
     * Delete settings
     *
     * @param stdClass $quiz
     */
    public static function delete_settings($quiz) {
        global $DB;
        $DB->delete_records('quizaccess_quizproctoring', ['quizid' => $quiz->id]);
    }

    /**
     * Settings sql
     *
     * @param int $quizid
     * @return string
     */
    public static function get_settings_sql($quizid) {
        return [
            'enableproctoring,enableteacherproctor,storeallimages,enableprofilematch,
            time_interval,warning_threshold,proctoringvideo_link',
            'LEFT JOIN {quizaccess_quizproctoring} proctoring ON proctoring.quizid = quiz.id',
            [],
        ];
    }

    /**
     * Current time attempt finished
     *
     */
    public function current_attempt_finished() {
        global $SESSION;
        // Clear the flag in the session that says that the user has already.
        // Entered the password for this quiz.
        if (!empty($SESSION->proctoringcheckedquizzes[$this->quiz->id])) {
            unset($SESSION->proctoringcheckedquizzes[$this->quiz->id]);
        }
    }

    /**
     * Sets up the attempt (review or summary) page with any properties required
     * by the access rules.
     *
     * @param moodle_page $page the page object to initialise.
     */
    public function setup_attempt_page($page) {
        global $PAGE, $DB, $CFG;
        $url = $PAGE->url;
        $urlname = pathinfo($url, PATHINFO_FILENAME);
        if ($urlname == 'review') {
            $attemptid = required_param('attempt', PARAM_INT);
            $cmid      = optional_param('cmid', null, PARAM_INT);
            $attemptobj = quiz_create_attempt_handling_errors($attemptid, $cmid);
            $quiz = $attemptobj->get_quiz();
            $userid = $attemptobj->get_userid();
            $release = get_config('moodle', 'release');
            $compareversion = '4.3';
            $context = context_module::instance($quiz->cmid);
            $proctoringimageshow = get_config('quizaccess_quizproctoring', 'proctoring_image_show');
            if (has_capability('quizaccess/quizproctoring:quizproctoringreport', $context)) {
                $quizinfo = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $quiz->id]);
                $usermages = $DB->get_record('quizaccess_proctor_data', [
                    'quizid' => $quiz->id,
                    'userid' => $userid,
                    'attemptid' => $attemptid,
                    'image_status' => 'M',
                ]);
            }
        }
    }
}
