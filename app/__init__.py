"""Veya AI package initialization.

Sanitizes any stale or broken SSL certificate environment variables before
any libraries (httpx, requests, langchain, groq) attempt to create SSL contexts.
"""
import os

for _var in ("SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE"):
    _val = os.environ.get(_var)
    if _val and not os.path.isfile(_val):
        os.environ.pop(_var, None)
