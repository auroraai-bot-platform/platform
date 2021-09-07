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
        # Loose pattern potential phone numbers. Later we require that the
        # string contains at least 6 digits.
        self.phone = re.compile('\(?\+?\d[\s\d()-]{5,}\d')

        self.ip = re.compile(
            '(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)', re.IGNORECASE)
        self.ipv6 = re.compile(
            '\s*(?!.*::.*::)(?:(?!:)|:(?=:))(?:[0-9a-f]{0,4}(?:(?<=::)|(?<!::):)){6}(?:[0-9a-f]{0,4}(?:(?<=::)|(?<!::):)[0-9a-f]{0,4}(?:(?<=::)|(?<!:)|(?<=:)(?<!::):)|(?:25[0-4]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-4]|2[0-4]\d|1\d\d|[1-9]?\d)){3})\s*', re.VERBOSE | re.IGNORECASE | re.DOTALL)
        self.hetu = re.compile('\d{6}[-+Aa]\d{3}[a-zA-Z0-9]')

        # list of regex patterns for things we don't want to anoymize from text
        # (e.g. dates)
        re_keep_pattern_list = ['\d{4}-\d{2}-\d{2}']
        self.re_keep_pattern = re.compile(
            '(' + '|'.join(re_keep_pattern_list) + ')')

    def replace_phone(self, match, min_digits=6):
        """Replace phone number if the string has at least 'min_digits' digits."""
        orig = match.group(0)
        digits = sum([c.isdigit() for c in orig])
        if digits >= min_digits:
            return '<phone>'
        else:
            return orig

    def anonymize_text(self, text: str) -> str:
        splitted_text = re.split(self.re_keep_pattern, text)
        for index, item in enumerate(splitted_text):
            if re.match(self.re_keep_pattern, item) is None:
                item = re.sub(self.hetu, "<hetu>", item)
                item = re.sub(self.phone, self.replace_phone, item)
                item = re.sub(self.ip, "<ip>", item)
                item = re.sub(self.ipv6, "<ip>", item)
                splitted_text[index] = item
        text = ''.join(splitted_text)
        return text
