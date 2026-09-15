from flask import jsonify

def success_response(data):
    return jsonify(data)
