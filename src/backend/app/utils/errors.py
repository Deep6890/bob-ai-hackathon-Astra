from flask import jsonify

class APIError(Exception):
    def __init__(self, message, code="INTERNAL_ERROR", status_code=500):
        self.message = message
        self.code = code
        self.status_code = status_code

    def to_dict(self):
        return {
            "error": {
                "code": self.code,
                "message": self.message
            }
        }

def register_error_handlers(app):
    @app.errorhandler(APIError)
    def handle_api_error(e):
        response = jsonify(e.to_dict())
        response.status_code = e.status_code
        return response

    @app.errorhandler(404)
    def handle_not_found(e):
        response = jsonify({
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested resource was not found."
            }
        })
        response.status_code = 404
        return response
