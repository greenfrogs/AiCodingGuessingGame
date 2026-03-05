import asyncio
import random


async def fetch_with_retry(fetch, attempts=4):
    last_error = None
    for attempt in range(attempts):
        try:
            return await fetch()
        except Exception as e:
            last_error = e
            if attempt < attempts - 1:
                base_delay = 2**attempt
                jitter = random.uniform(0, base_delay * 0.5)
                await asyncio.sleep(base_delay + jitter)
    raise last_error
