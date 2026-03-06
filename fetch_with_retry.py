import asyncio
import random


async def fetch_with_retry(fetch, attempts=5, base_delay=1.0, max_delay=60.0):
    last_error = None
    for attempt in range(attempts):
        try:
            result = await fetch()
            return result
        except Exception as exc:
            last_error = exc
            if attempt >= attempts - 1:
                break
            exp_backoff = min(base_delay * (2 ** attempt), max_delay)
            jitter = random.uniform(0, exp_backoff * 0.3)
            delay = exp_backoff + jitter
            await asyncio.sleep(delay)
    raise RuntimeError(
        f"fetch_with_retry failed after {attempts} attempts: {last_error}"
    )
