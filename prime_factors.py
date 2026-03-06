def prime_factors(n):
    if n < 2:
        return []
    limit = n + 1
    smallest_prime = list(range(limit))
    for i in range(2, int(limit**0.5) + 1):
        if smallest_prime[i] == i:
            for j in range(i * i, limit, i):
                if smallest_prime[j] == j:
                    smallest_prime[j] = i
    factors = []
    while n > 1:
        p = smallest_prime[n]
        factors.append(p)
        n //= p
    return factors
