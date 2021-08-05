import re


class TextAnonymizer():
    """
    Text anonymizer class for replacing personally identifiable information from text data.
    Currently replaces only phone numbers, IP addresses and Finnish social security numbers with appropriate tags.

    Methods
    -------
    anonymize_text(text: str)
        Returns anonymized text.
    """

    def __init__(self) -> None:
        self.phone = re.compile(
            '((?:(?<![\d-])(?:\+?\d{1,3}[-.\s*]?)?(?:\(?\d{3}\)?[-.\s*]?)?\d{3}[-.\s*]?\d{4}(?![\d-]))|(?:(?<![\d-])(?:(?:\(\+?\d{2}\))|(?:\+?\d{2}))\s*\d{2}\s*\d{3}\s*\d{4}(?![\d-])))')
        self.ip = re.compile(
            '(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)', re.IGNORECASE)
        self.ipv6 = re.compile(
            '\s*(?!.*::.*::)(?:(?!:)|:(?=:))(?:[0-9a-f]{0,4}(?:(?<=::)|(?<!::):)){6}(?:[0-9a-f]{0,4}(?:(?<=::)|(?<!::):)[0-9a-f]{0,4}(?:(?<=::)|(?<!:)|(?<=:)(?<!::):)|(?:25[0-4]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-4]|2[0-4]\d|1\d\d|[1-9]?\d)){3})\s*', re.VERBOSE | re.IGNORECASE | re.DOTALL)
        self.hetu = re.compile('\d{6}[+-A]\d{3}[a-zA-Z0-9]')

    def anonymize_text(self, text: str) -> str:
        text = re.sub(self.hetu, "<hetu>", text)
        text = re.sub(self.phone, "<phone>", text)
        text = re.sub(self.ip, "<ip>", text)
        text = re.sub(self.ipv6, "<ip>", text)
        return text
