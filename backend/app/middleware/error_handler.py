import logging
from flask import jsonify

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "status": "error",
            "message": getattr(error, 'description', 'Bad Request')
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            "status": "error",
            "message": getattr(error, 'description', 'Unauthorized')
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            "status": "error",
            "message": getattr(error, 'description', 'Forbidden')
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "status": "error",
            "message": getattr(error, 'description', 'Resource Not Found')
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "status": "error",
            "message": "Method Not Allowed"
        }), 405

    @app.errorhandler(500)
    def internal_server_error(error):
        logger.error(f"Internal server error: {error}")
        return jsonify({
            "status": "error",
            "message": "An unexpected server error occurred. Please try again later."
        }), 500

