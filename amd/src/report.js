define(['jquery'], function($) {
    return {
        init: function() {
            $('.delete-icon').on('click', function(event) {
                var username = $(this).data('username');
                var confirmation = confirm('Delete all the Images of user "' + username + '"?');
                if (!confirmation) {
                    event.preventDefault();
                }
            });

            $('.delete-quiz').on('click', function(event) {
                var quizname = $(this).data('quiz');
                var confirmation = confirm('Delete all the Images of quiz "' + quizname + '"?');
                if (!confirmation) {
                    event.preventDefault();
                }
            });

            $('.delcourse').on('click', function(event) {
                var coursename = $(this).data('course');
                var confirmation = confirm('Delete all the Images of course "' + coursename + '"?');
                if (!confirmation) {
                    event.preventDefault();
                }
            });

            $('.proctoringimage').on('click', function(event) {
                var attemptid = $(this).data('attemptid');
                var quizid = $(this).data('quizid');
                var userid = $(this).data('userid');
                var confirmation = confirm('Delete all the Images of course "' + attemptid + '"?');
                if (!confirmation) {
                    event.preventDefault();
                }
            });
        }
    };
});
