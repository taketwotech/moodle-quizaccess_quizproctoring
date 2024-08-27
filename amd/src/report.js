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
                var quiz_name = $(this).data('quiz');
                var confirmation = confirm('Delete all the Images of quiz "' + quiz_name + '"?');
                if (!confirmation) {
                    event.preventDefault();
                }
            });

            $('.delcourse').on('click', function(event) {
                var course_name = $(this).data('course');
                var confirmation = confirm('Delete all the Images of course "' + course_name + '"?');
                if (!confirmation) {
                    event.preventDefault();
                }
            });
        }
    };
});
