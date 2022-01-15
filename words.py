#!/usr/bin/env python3

import sys
import random


def usage(_argv):
    print("""words.py command
    help
    dedouble [filename]
    random [filename]
    random-list [filename] [n]""")


def dedouble(argv):
    if not argv:
        return

    with open(argv[0]) as f:
        words = f.read().split()

    with open(argv[0], "w") as f:
        f.write("\n".join(sorted([w.lower() for w in set(words)])))
        f.write("\n")


def random_word(argv):
    with open(argv[0]) as f:
        words = f.read().split()

    print(random.choice(words))


def random_list(argv):
    with open(argv[0]) as f:
        words = f.read().split()

    n = int(argv[1]) if len(argv) >= 2 else 10
    result = set([])

    while len(result) != n:
        result.add(random.choice(words))

    print("\n".join(sorted(list(result))))


def main(argv):
    if not argv:
        usage([])
        return

    commands = {
        "help": usage,
        "dedouble": dedouble,
        "random": random_word,
        "random-list": random_list,
    }

    commands[argv[0]](argv[1:])


if __name__ == "__main__":
    main(sys.argv[1:])
