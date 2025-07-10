from flask import Flask, render_template, request, redirect, url_for, jsonify
import psycopg2
import os
import logging
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Load app version from .env
APP_VERSION = os.getenv("APP_VERSION", "0.0.0")


def create_connection():
    try:
        connection = psycopg2.connect(
            user=os.getenv("DB_USERNAME"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            database=os.getenv("DB_NAME"),
        )
        return connection
    except Exception as e:
        print("Error connecting to PostgreSQL:", e)
        return None


@app.context_processor
def inject_globals():
    return {"app_version": APP_VERSION, "current_year": datetime.now().year}


@app.route("/", methods=["GET"])
def index():
    return render_template(
        "index.html", goals=[], added=False, deleted=False, edited=False
    )


@app.route("/get_goals", methods=["GET"])
def get_goals():
    connection = create_connection()
    if connection:
        cursor = connection.cursor()
        cursor.execute("SELECT id, goal_name, is_success FROM goals")
        rows = cursor.fetchall()
        cursor.close()
        connection.close()

        # Convert rows (list of tuples) to list of dicts for JSON
        goals = []
        for row in rows:
            goals.append({"id": row[0], "goal_name": row[1], "isSuccess": row[2]})

        return jsonify({"goals": goals}), 200
    else:
        return jsonify({"status": "error", "message": "DB connection failed"}), 500


@app.route("/add_goal", methods=["POST"])
def add_goal():
    try:
        data = request.get_json()
        goal_name = data.get("goal_name")
        is_success = bool(data.get("is_success", False))

        if not goal_name:
            return jsonify({"status": "error", "message": "Missing goal_name"}), 400

        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            cursor.execute(
                "INSERT INTO goals (goal_name, is_success) VALUES (%s, %s) RETURNING id",
                (goal_name, is_success),
            )
            new_id = cursor.fetchone()[0]
            connection.commit()
            cursor.close()
            connection.close()

            return (
                jsonify(
                    {
                        "status": "success",
                        "goal": goal_name,
                        "isSuccess": is_success,
                        "goal_id": new_id,
                    }
                ),
                200,
            )
        else:
            return (
                jsonify({"status": "error", "message": "Database connection failed"}),
                500,
            )

    except Exception as e:
        print("Error in /add_goal:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/remove_goal", methods=["POST"])
def remove_goal():
    data = request.get_json()
    goal_id_raw = data.get("goal_id")

    # print("Raw goal_id from request:", repr(goal_id_raw))

    try:
        goal_id = int(goal_id_raw)
    except (TypeError, ValueError):
        return (
            jsonify({"status": "error", "message": "Invalid or missing goal_id"}),
            400,
        )

    try:
        connection = create_connection()
        if not connection:
            return jsonify({"status": "error", "message": "DB connection failed"}), 500

        cursor = connection.cursor()
        cursor.execute("DELETE FROM goals WHERE id = %s", (goal_id,))
        connection.commit()
        cursor.close()
        connection.close()
        return jsonify({"status": "success"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/update_goal_status", methods=["POST"])
def update_goal_status():
    try:
        data = request.get_json()
        goal_id = data.get("goal_id")
        new_status = data.get("is_success")  
        # print("Raw goal_id from request:", repr(goal_id))

        if goal_id is None or new_status is None:
            return jsonify({'status': 'error', 'message': 'Missing goal_id or status'}), 400

        connection = create_connection()
        if not connection:
            return jsonify({'status': 'error', 'message': 'Database connection failed'}), 500

        cursor = connection.cursor()
        cursor.execute(
            "UPDATE goals SET is_success = %s WHERE id = %s",
            (new_status, goal_id)
        )
        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({'status': 'success'}), 200

    except Exception as e:
        logging.error(f"Error updating goal status: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


if __name__ == "__main__":
    # app.run(host="0.0.0.0", port=8080, debug=True)
    app.run(host="0.0.0.0", port=8080)
