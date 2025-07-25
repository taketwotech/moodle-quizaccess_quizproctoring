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

if (class_exists('\mod_quiz\local\access_rule_base')) {
    class_alias('\mod_quiz\local\access_rule_base', '\quizaccess_quizproctoring_rule_base');
    class_alias('\mod_quiz\form\preflight_check_form', '\quizaccess_quizproctoring_preflight_form');
} else {
    require_once($CFG->dirroot . '/mod/quiz/accessrule/accessrulebase.php');
    class_alias('\quiz_access_rule_base', '\quizaccess_quizproctoring_rule_base');
    class_alias('\mod_quiz_preflight_check_form', '\quizaccess_quizproctoring_preflight_form');
}
/**
 * A rule representing the safe browser check.
 *
 * @copyright  2020 Mahendra Soni <ms@taketwotechnologies.com> {@link https://taketwotechnologies.com}
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class quizaccess_quizproctoring extends quizaccess_quizproctoring_rule_base {

    /**
     * * Information, such as might be shown on the quiz view page, relating to this restriction.
     * There is no obligation to return anything. If it is not appropriate to tell students
     * about this rule, then just return ''.
     *
     * @param quiz $quizobj quiz object
     * @param int $timenow current time
     * @param bool $canignoretimelimits ignore time limits
     *
     * @return quizaccess_quizproctoring_rule_base|quizaccess_proctoring|null
     */
    public static function make($quizobj, $timenow, $canignoretimelimits) {

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
        $url = new moodle_url('/admin/settings.php', ['section' => 'modsettingsquizcatproctoring']);
        $url = $url->out();
        $attemptid = optional_param('attempt', 0, PARAM_INT);

        $isactive = get_config('quizaccess_quizproctoring', 'getuserinfo');
        $accesstoken = get_config('quizaccess_quizproctoring', 'accesstoken');
        $accesstokensecret = get_config('quizaccess_quizproctoring', 'accesstokensecret');
        if ($isactive === '0') {
            if ($isadmin) {
                return false;
            } else {
                if (empty($attemptid)) {
                    return get_string('warningstudent', 'quizaccess_quizproctoring');
                }
            }
        }
        if (empty($accesstoken) || empty($accesstokensecret)) {
            if ($isadmin) {
                return get_string('warningopensourse', 'quizaccess_quizproctoring', $url);
            } else {
                return get_string('warningstudent', 'quizaccess_quizproctoring');
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
        global $OUTPUT, $DB, $USER;
        $isadmin = is_siteadmin($USER);
        $id = required_param('id', PARAM_INT);
        $sql = "SELECT cm.* FROM {modules} md JOIN {course_modules} cm ON cm.module = md.id WHERE cm.id = $id";
        $getquiz = $DB->get_record_sql($sql);
        $button = '';
        $notice = '';
        $context = context_module::instance($id);
        if ($DB->record_exists('quizaccess_quizproctoring', ['quizid' => $getquiz->instance,
            'enableteacherproctor' => 1])) {
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
        $isactive = get_config('quizaccess_quizproctoring', 'getuserinfo');
        if ($isactive === '0' && $isadmin) {
            $notice = '<span class="delete-icon">' . get_string('warningexpire', 'quizaccess_quizproctoring') . '</span>';
        }
        return get_string('proctoringnotice', 'quizaccess_quizproctoring').'<br>'.$notice.$button;
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
        $attemptid = $attemptid ? $attemptid : 0;
        if ($DB->record_exists('quizaccess_main_proctor', ['quizid' => $this->quiz->id,
            'image_status' => 'M', 'userid' => $USER->id, 'deleted' => 0, 'status' => '' ])) {
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
     * @param quizaccess_quizproctoring_preflight_form $quizform quiz form
     * @param MoodleQuickForm $mform mform
     * @param int $attemptid attempt id
     * @return String
     *
     */
    public function add_preflight_check_form_fields(quizaccess_quizproctoring_preflight_form $quizform,
            MoodleQuickForm $mform, $attemptid) {
        global $PAGE, $DB, $USER;

        $securewindow = $DB->get_record('quiz', ['id' => $this->quiz->id]);
        $proctoringdata = $DB->get_record('quizaccess_quizproctoring', ['quizid' => $this->quiz->id]);
        $PAGE->requires->js_call_amd('quizaccess_quizproctoring/add_camera',
            'init', [$this->quiz->cmid, true, false, $attemptid, false,
                $this->quiz->id, $proctoringdata->enableeyecheckreal,
        null, $proctoringdata->enableteacherproctor, $securewindow->browsersecurity]);
        $PAGE->requires->strings_for_js([
        'nocameradetected',
        'nocameradetectedm',
        ], 'quizaccess_quizproctoring');
        $element = $mform->addElement('static', 'proctoringmsg', '',
            get_string('notice', 'quizaccess_quizproctoring'));
        $element->setAttributes(['class' => 'proctoringmsg']);

        if ($proctoringdata->enableprofilematch == 1) {
            $datauri = null;
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
        $videotag = html_writer::tag('video', '', ['id' => 'video', 'width' => '320',
            'height' => '240', 'autoplay' => 'autoplay', 'draggable' => 'false']);
        $html .= html_writer::div($videotag, 'col-md-9');
        $html .= html_writer::end_tag('div');

        // Canvas tag.
        $html .= html_writer::start_tag('div', ['id' => 'fitem_id_user_canvas', 'class' => 'form-group row fitem videohtml']);
        $html .= html_writer::div('', 'col-md-3');
        $canvastag = html_writer::tag('canvas', '', ['id' => 'canvas', 'width' => '320', 'height' => '240', 'class' => 'hidden']);
        $html .= html_writer::div($canvastag, 'col-md-9');
        $html .= html_writer::end_tag('div');
        $mform->addElement('html', $html);

        // Add consent checkbox at the top.
        $mform->addElement('advcheckbox', 'consentcheckbox', '',
            get_string('confirmationconcent', 'quizaccess_quizproctoring'),
            ['class' => 'consentcheckbox']);

        // Take picture button.
        $html = html_writer::start_tag('div', ['id' => 'fitem_id_user_takepicture', 'class' => 'form-group row fitem']);
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
        if (!empty($proctoringdata) && $proctoringdata->enableuploadidentity == 1) {
            $mform->addElement('filemanager', 'user_identity', get_string('uploadidentity',
            'quizaccess_quizproctoring'), null, $filemanageroptions);
        }
        $mform->addElement('hidden', 'userimageset', '', ['id' => 'userimageset']);
        $mform->setType('userimageset', PARAM_INT);
        $mform->setDefault('userimageset', 0);

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
        $useridentity = isset($data['user_identity']) ? $data['user_identity'] : 0;
        $cmid = isset($data['cmid']) ? $data['cmid'] : 0;
        $userimg = isset($data['userimg']) ? $data['userimg'] : null;
        $record = new stdClass();
        $record->user_identity = $useridentity;
        $record->userid = $USER->id;
        $record->quizid = $this->quiz->id;
        $record->userimg = $userimg;
        $attemptid = $attemptid ? $attemptid : 0;
        $record->attemptid = $attemptid;
        // We probably have an entry already in DB.
        $file = file_get_draft_area_info($useridentity);
        if ($rc = $DB->get_record('quizaccess_main_proctor', ['userid' =>
            $USER->id, 'quizid' => $this->quiz->id, 'attemptid' => $attemptid, 'image_status' => 'I' ])) {
            $context = context_module::instance($cmid);
            $rc->image_status = 'M';
            if ($file['filecount'] > 0) {
                $rc->user_identity = $useridentity;
                $DB->update_record('quizaccess_main_proctor', $rc);
                file_save_draft_area_files($useridentity, $context->id, 'quizaccess_quizproctoring', 'identity', $rc->id);
            } else {
                $DB->update_record('quizaccess_main_proctor', $rc);
            }

        } else {
            $id = $DB->insert_record('quizaccess_main_proctor', $record);
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
        $mform->addElement('selectyesno', 'enableproctoring', get_string('enableproctoring', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('enableproctoring', 'enableproctoring', 'quizaccess_quizproctoring');
        $mform->setDefault('enableproctoring', 0);

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

        $mform->addElement('selectyesno', 'enableuploadidentity',
        get_string('enableuploadidentity', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('enableuploadidentity', 'enableuploadidentity', 'quizaccess_quizproctoring');
        $mform->setDefault('enableuploadidentity', 0);
        $mform->hideIf('enableuploadidentity', 'enableproctoring', 'eq', '0');

        // Allow admin or teacher to setup profile picture match.
        $mform->addElement('selectyesno', 'enableprofilematch',
            get_string('enableprofilematch', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('enableprofilematch', 'enableprofilematch', 'quizaccess_quizproctoring');
        $mform->setDefault('enableprofilematch', 0);
        $mform->hideIf('enableprofilematch', 'enableproctoring', 'eq', '0');

        // Allow admin or teacher to setup student video.
        $mform->addElement('selectyesno', 'enablestudentvideo',
            get_string('enablestudentvideo', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('enablestudentvideo', 'enablestudentvideo', 'quizaccess_quizproctoring');
        $mform->setDefault('enablestudentvideo', 1);
        $mform->hideIf('enablestudentvideo', 'enableproctoring', 'eq', '0');

        // Allow admin or teacher to setup student video.
        $mform->addElement('selectyesno', 'enableeyecheckreal',
            get_string('enableeyecheckreal', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('enableeyecheckreal', 'enableeyecheckreal', 'quizaccess_quizproctoring');
        $mform->setDefault('enableeyecheckreal', 0);
        $mform->hideIf('enableeyecheckreal', 'enableproctoring', 'eq', '0');

        // Add a message that appears only when both options are yes.
        $mform->addElement('textarea', 'eyecheckrealnote', '');
        $mform->setDefault('eyecheckrealnote', get_string('eyecheckrealnote', 'quizaccess_quizproctoring'));
        $mform->freeze('eyecheckrealnote');
        $mform->hideIf('eyecheckrealnote', 'enableproctoring', 'eq', 0);
        $mform->hideIf('eyecheckrealnote', 'enableeyecheckreal', 'eq', 0);

        // Allow admin or teacher to setup student video.
        $mform->addElement('hidden', 'enableeyecheck', 0);
        $mform->setType('enableeyecheck', PARAM_INT);

        // Time interval set for proctoring image.
        $mform->addElement('select', 'time_interval',
            get_string('proctoringtimeinterval', 'quizaccess_quizproctoring'), [
            "15" => get_string('fiftenseconds', 'quizaccess_quizproctoring'),
            "20" => get_string('twentyseconds', 'quizaccess_quizproctoring'),
            "30" => get_string('thirtyseconds', 'quizaccess_quizproctoring'),
            "60" => get_string('oneminute', 'quizaccess_quizproctoring'),
            "120" => get_string('twominutes', 'quizaccess_quizproctoring'),
            "180" => get_string('threeminutes', 'quizaccess_quizproctoring'),
            "240" => get_string('fourminutes', 'quizaccess_quizproctoring'),
            "300" => get_string('fiveminutes', 'quizaccess_quizproctoring'),
        ]);
        $mform->addHelpButton('time_interval', 'proctoringtimeinterval', 'quizaccess_quizproctoring');
        $mform->setDefault('time_interval', get_config('quizaccess_quizproctoring', 'img_check_time'));
        $mform->hideIf('time_interval', 'enableproctoring', 'eq', '0');

        $thresholds = [];
        for ($i = 0; $i <= 50; $i += 5) {
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
        $mform->setType('proctoringvideo_link', PARAM_URL);

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
            $record->enableuploadidentity = 0;
            $record->enablestudentvideo = 1;
            $record->enableeyecheckreal = 1;
            $record->enableeyecheck = 0;
            $record->storeallimages = 0;
            $record->time_interval = 0;
            $record->warning_threshold = isset($quiz->warning_threshold) ? $quiz->warning_threshold : 0;
            $record->proctoringvideo_link = $quiz->proctoringvideo_link;
            $DB->insert_record('quizaccess_quizproctoring', $record);
        } else {
            $DB->delete_records('quizaccess_quizproctoring', ['quizid' => $quiz->id]);
            $record = new stdClass();
            $record->quizid = $quiz->id;
            $record->enableproctoring = 1;
            $record->enableteacherproctor = $quiz->enableteacherproctor;
            $record->enableprofilematch = $quiz->enableprofilematch;
            $record->enableuploadidentity = $quiz->enableuploadidentity;
            $record->enablestudentvideo = $quiz->enablestudentvideo;
            $record->enableeyecheckreal = $quiz->enableeyecheckreal;
            $record->enableeyecheck = $quiz->enableeyecheck;
            $record->storeallimages = $quiz->storeallimages;
            $record->time_interval = $quiz->time_interval;
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
            enablestudentvideo,time_interval,enableeyecheck,enableeyecheckreal,
            enableuploadidentity,warning_threshold,proctoringvideo_link',
            'LEFT JOIN {quizaccess_quizproctoring} proctorlink ON proctorlink.quizid = quiz.id',
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
}
