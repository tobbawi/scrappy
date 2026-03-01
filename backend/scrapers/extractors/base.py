from abc import ABC, abstractmethod
from bs4 import BeautifulSoup


class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, soup: BeautifulSoup, data: dict) -> dict:
        """Fill missing fields in data dict. Return updated dict.
        Only fill fields that are still None — earlier extractors win.
        """
        ...

    def _set_if_missing(self, data: dict, key: str, value) -> dict:
        """Only set value if key is not already populated."""
        if value and not data.get(key):
            data[key] = value
        return data
