def prime_factors(n):
    if n < 2:
        return []
    spf = list(range(n + 1))
    i = 2
    while i * i <= n:
        if spf[i] == i:
            for j in range(i * i, n + 1, i):
                if spf[j] == j:
                    spf[j] = i
        i += 1
    factors = []
    while n > 1:
        factors.append(spf[n])
        n //= spf[n]
    return factors
