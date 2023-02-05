<?php
/**
 * Implementaton of the quizaccess_quizproctoring plugin.
 *
 * @package    quizaccess
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

    public static function make(quiz $quizobj, $timenow, $canignoretimelimits) {

        if (!$quizobj->get_quiz()->enableproctoring) {
            return null;
        }
        return new self($quizobj, $timenow);
    }

    public function prevent_access() {
        if (!$this->check_proctoring()) {
            return get_string('proctoringerror', 'quizaccess_quizproctoring');
        } else {
            return false;
        }
    }

    public function description() {
        return get_string('proctoringnotice', 'quizaccess_quizproctoring');
    }

    public function is_preflight_check_required($attemptid) {
        global $SESSION, $DB, $USER;
        $user = $DB->get_record('user', array('id' => $USER->id), '*', MUST_EXIST);
        $attemptid = $attemptid ? $attemptid : 0;
        if ($DB->record_exists('quizaccess_proctor_data', array('quizid' => $this->quiz->id, 'image_status' => 'M', 'userid' => $user->id,'deleted' => 0, 'status'=> '' ))) {
            return false;
        } else {
            return true;
        }
    }
 
    public function add_preflight_check_form_fields(mod_quiz_preflight_check_form $quizform,
            MoodleQuickForm $mform, $attemptid) {
        global $PAGE,$DB;

        $proctoringdata = $DB->get_record('quizaccess_quizproctoring', array('quizid' => $this->quiz->id));
        $PAGE->requires->js_call_amd('quizaccess_quizproctoring/add_camera', 'init', [$this->quiz->cmid, true, false, $attemptid]);
    
        $mform->addElement('static', 'proctoringmessage', '',
                get_string('requireproctoringmessage', 'quizaccess_quizproctoring'));

        $filemanager_options = array();
        $filemanager_options['accepted_types'] = '*';
        $filemanager_options['maxbytes'] = 0;
        $filemanager_options['maxfiles'] = 1;
        $filemanager_options['mainfile'] = true;
        //video tag
        $html = html_writer::start_tag('div', array('id' => 'fitem_id_user_video', 'class' => 'form-group row fitem videohtml'));
        $html .= html_writer::div('','col-md-3');
        $videotag   = html_writer::tag('video', '', array('id' => 'video', 'width' => '320', 'height' => '240', 'autoplay'=>'autoplay'));
        $html .= html_writer::div($videotag, 'col-md-9');
        $html .= html_writer::end_tag('div');

        //canvas tag
        $html  .= html_writer::start_tag('div', array('id' => 'fitem_id_user_canvas', 'class' =>'form-group row fitem videohtml'));
        $html .= html_writer::div('', 'col-md-3');
        $canvastag   = html_writer::tag('canvas', '', array('id' => 'canvas', 'width' => '320', 'height' => '240', 'class'=>'hidden'));
        $html .= html_writer::div($canvastag, 'col-md-9');
        $html .= html_writer::end_tag('div');
                        
        //Take picture button
        $html .= html_writer::start_tag('div', array('id' => 'fitem_id_user_takepicture', 'class' =>'form-group row fitem'));
        $html .= html_writer::div('', 'col-md-3');
        

        $button = html_writer::tag('button', get_string('takepicture', 'quizaccess_quizproctoring'), 
            array('class' => 'btn btn-primary', 'id' => 'takepicture'));
        $html .= html_writer::div($button, 'col-md-9');
        $html .= html_writer::end_tag('div');

        //Retake button
        $html .= html_writer::start_tag('div', array('id' => 'fitem_id_user_retake', 'class' =>'form-group row fitem'));
        $html .= html_writer::div('', 'col-md-3');
        $button = html_writer::tag('button', get_string('retake', 'quizaccess_quizproctoring'), 
            array('class' => 'btn btn-primary hidden', 'id' => 'retake'));
        $html .= html_writer::div($button, 'col-md-9');
        $html .= html_writer::end_tag('div');

        $mform->addElement('hidden','userimg');
        $mform->setType('userimg',PARAM_TEXT);
        $mform->addElement('html', $html);
        $mform->addElement('filemanager', 'user_identity', get_string('uploadidentity', 'quizaccess_quizproctoring'), null, $filemanager_options);
        $mform->addRule('user_identity', null, 'required', null, 'client');

        //Video button
        if ($proctoringdata->proctoringvideo_link) {

            $html = html_writer::start_tag('div', array('id' => 'fitem_id_user_demovideo', 'class' =>'form-group row fitem'));
            $html .= html_writer::div('', 'col-md-3');
            $link = html_writer::tag('a', get_string('demovideo', 'quizaccess_quizproctoring'),
                array('id' => 'demovideo', 'target' => '_blank', 'href' => $proctoringdata->proctoringvideo_link));
            $html .= html_writer::div($link, 'col-md-9');
            $html .= html_writer::end_tag('div');

            $mform->addElement('html', $html);
        }

    }

    public function validate_preflight_check($data, $files, $errors, $attemptid) {
        global $USER, $DB, $CFG;
        $user_identity = $data['user_identity'];
        $cmid =  $data['cmid'];
        $userimg = $data['userimg'];
        $record = new stdClass();
        $record->user_identity = $user_identity;
        $record->userid = $USER->id;
        $record->quizid = $this->quiz->id;
        $record->userimg = $userimg;
        $attemptid = $attemptid ? $attemptid : 0;
        $record->attemptid = $attemptid;
        // We probably have an entry already in DB.
        $file = file_get_draft_area_info($user_identity);
        if ($rc = $DB->get_record('quizaccess_proctor_data', array('userid' => $USER->id, 'quizid' => $this->quiz->id, 'attemptid' => $attemptid, 'image_status' => 'I' ))) {
            $context = context_module::instance($cmid);
            $rc->user_identity = $user_identity;
            $rc->image_status = 'M';
            if ($file['filecount'] > 0) {
                $DB->update_record('quizaccess_proctor_data', $rc);
                file_save_draft_area_files($user_identity, $context->id, 'quizaccess_quizproctoring', 'identity' , $rc->id);
            } else {
                $errors['user_identity'] = get_string('useridentityerror', 'quizaccess_quizproctoring');
            }

        } else if ($file['filecount'] > 0) {
            $id = $DB->insert_record('quizaccess_proctor_data', $record);
            $context = context_module::instance($cmid);
            file_save_draft_area_files($user_identity, $context->id,'quizaccess_quizproctoring', 'identity' , $id);
        } else {
            $errors['user_identity'] = get_string('useridentityerror', 'quizaccess_quizproctoring');
        }
        return $errors; 
    }

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

    public static function add_settings_form_fields(
            mod_quiz_mod_form $quizform, MoodleQuickForm $mform) {
        global $CFG;
                
        // Allow to enable the access rule only if the Mobile services are enabled.
        $mform->addElement('selectyesno', 'enableproctoring', get_string('enableproctoring', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('enableproctoring', 'enableproctoring', 'quizaccess_quizproctoring');
        $mform->setDefault('enableproctoring', 0);

        // time interval set for proctoring image.
        $mform->addElement('select', 'time_interval', get_string('proctoringtimeinterval','quizaccess_quizproctoring'),
                array("5"=>"5 seconds","10"=>"10 seconds","15"=>"15 seconds","20"=>"20 seconds","30"=>"30 seconds","60"=>"1 minute","120" => "2 minutes","180" => "3 minutes","240" => "4 minutes","300"=>"5 minutes","600" => "10 minutes","900" => "15 minutes"));
       // $mform->addHelpButton('interval', 'interval', 'quiz');
        $mform->setDefault('time_interval', $CFG->quizaccess_quizproctoring_img_check_time);

        $thresholds = array();
        for ($i = 0; $i <= 20; $i++) {
            if ($i == 0) {
                $thresholds[$i] = 'Unlimited';
            } else {
                $thresholds[$i] = $i;
            }
        }
        // Allow admin to setup warnings threshold
        $mform->addElement('select', 'warning_threshold', get_string('warning_threshold', 'quizaccess_quizproctoring'), $thresholds);
        $mform->addHelpButton('warning_threshold', 'warning_threshold', 'quizaccess_quizproctoring');
        $mform->setDefault('warning_threshold', 0);
        $mform->hideIf('warning_threshold', 'enableproctoring', 'eq', '0');

        // -------------------------------------------------------------------------------
        $mform->addElement('header', 'orderlinesettings', get_string('orderlinesettings', 'quizaccess_quizproctoring'));

        // Allow admin to setup this trigger only once
        $mform->addElement('selectyesno', 'triggeresamail', get_string('triggeresamail', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('triggeresamail', 'triggeresamail', 'quizaccess_quizproctoring');
        $mform->setDefault('triggeresamail', 0);

        $mform->addElement('text', 'ci_test_id', get_string('citestid', 'quizaccess_quizproctoring'), array('size'=>'32'));
        $mform->addHelpButton('ci_test_id', 'citestid', 'quizaccess_quizproctoring');

        $mform->addElement('text', 'quiz_sku', get_string('quizsku', 'quizaccess_quizproctoring'), array('size'=>'32'));
        $mform->addHelpButton('quiz_sku', 'quizsku', 'quizaccess_quizproctoring');

        $mform->addElement('text', 'proctoringvideo_link', get_string('proctoring_videolink', 'quizaccess_quizproctoring'));
        $mform->addHelpButton('proctoringvideo_link', 'proctoringlink', 'quizaccess_quizproctoring');
    }

    public static function save_settings($quiz) {
        global $DB;
        
        $interval = required_param('time_interval',PARAM_INT);
        if (empty($quiz->enableproctoring)) {
            $DB->delete_records('quizaccess_quizproctoring', array('quizid' => $quiz->id));
            $record = new stdClass();
            $record->quizid = $quiz->id;
            $record->enableproctoring = 0;
            $record->triggeresamail = empty($quiz->triggeresamail) ? 0 : 1;
            $record->time_interval = $interval;
            $record->warning_threshold = isset($quiz->warning_threshold) ? $quiz->warning_threshold : 0;
            $record->ci_test_id = isset($quiz->ci_test_id) ? $quiz->ci_test_id : 0;
            $record->proctoringvideo_link = $quiz->proctoringvideo_link;
            if (isset($quiz->quiz_sku) && $quiz->quiz_sku) {
                $record->quiz_sku = $quiz->quiz_sku;
            }
            $DB->insert_record('quizaccess_quizproctoring', $record);
        } else {
            $DB->delete_records('quizaccess_quizproctoring', array('quizid' => $quiz->id));
            $record = new stdClass();
            $record->quizid = $quiz->id;
            $record->enableproctoring = 1;
            $record->triggeresamail = empty($quiz->triggeresamail) ? 0 : 1;
            $record->time_interval = $interval;
            $record->warning_threshold = isset($quiz->warning_threshold) ? $quiz->warning_threshold : 0;
            $record->ci_test_id = isset($quiz->ci_test_id) ? $quiz->ci_test_id : 0;
            $record->proctoringvideo_link = $quiz->proctoringvideo_link;
            if (isset($quiz->quiz_sku) && $quiz->quiz_sku) {
                $record->quiz_sku = $quiz->quiz_sku;
            }
            $DB->insert_record('quizaccess_quizproctoring', $record);
        }
    }

    public static function delete_settings($quiz) {
        global $DB;
        $DB->delete_records('quizaccess_quizproctoring', array('quizid' => $quiz->id));
    }
    
    public static function get_settings_sql($quizid) {
        return array(
            'enableproctoring,time_interval,triggeresamail,warning_threshold,ci_test_id,quiz_sku,proctoringvideo_link',
            'LEFT JOIN {quizaccess_quizproctoring} proctoring ON proctoring.quizid = quiz.id',
            array());
    }

    public function current_attempt_finished() {
        global $SESSION;
        // Clear the flag in the session that says that the user has already
        // entered the password for this quiz.
        if (!empty($SESSION->proctoringcheckedquizzes[$this->quiz->id])) {
            unset($SESSION->proctoringcheckedquizzes[$this->quiz->id]);
        }
    }
}
