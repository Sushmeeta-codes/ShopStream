from flask_pymongo import PyMongo

mongo = PyMongo()


def init_db(app):
    mongo.init_app(app)

    try:
        mongo.cx.admin.command("ping")
        print("MongoDB Connected Successfully!")

    except Exception as error:
        print("MongoDB Connection Failed:", error)
        raise