import functools
import os

from deta import Deta, App
from flask import Flask, Response, render_template


app = App(Flask(__name__, static_url_path=""))
deta = Deta(os.environ["DETA_PROJECT_KEY"])
db = deta.Base("motle")


@functools.cache
def load_words():
    with open("words.txt") as f:
        return f.read().split()


@functools.cache
def load_history():
    with open("history.txt") as f:
        return f.read().split()


@functools.cache
def load_word_of_the_day():
    word = db.get("word_of_the_day")

    if word:
        return word["value"]

    with open("wordoftheday.txt") as f:
        word = f.read().strip()

    db.put({"key": "word_of_the_day", "value": word})

    return word


@app.get("/")
def index():
    return render_template("index.html", word_of_the_day=load_word_of_the_day())


@app.get("/api/history")
def api_history():
    history = load_history()

    return Response(
        "\n".join(history[:history.index(load_word_of_the_day())]),
        mimetype="text/plain"
    )


@app.get("/api/words")
def api_words():
    return Response(
        "\n".join(load_words()),
        mimetype="text/plain"
    )


@app.lib.cron()
def cron_job(event):
    history = load_history()

    try:
        word = history[history.index(load_word_of_the_day()) + 1]
    except IndexError:
        word = load_word_of_the_day()

    db.put({"key": "word_of_the_day", "value": word})

    load_words.cache_clear()
    load_word_of_the_day.cache_clear()
    load_history.cache_clear()


if __name__ == "__main__":
    app.run()
