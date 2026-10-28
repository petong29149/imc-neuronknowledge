"""Retrieval evaluation (plan T11); the logic lives in knowledge.evaluation.

docker compose exec api python eval/run_eval.py --questions eval/questions.jsonl
docker compose exec api python eval/run_eval.py --configs dense,hybrid --k 5
"""

import sys

from knowledge.evaluation import main

if __name__ == "__main__":
    sys.exit(main())
