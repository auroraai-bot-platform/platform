
class CarouselMock:

    def kuopio(self):

        name_a = 'Vamos - Kuopio'
        name_b = 'Kulttuuriareena 44'
        name_c = 'Petosen Pinari'
        name_d = 'Jynkän Monari'

        url_a = 'https://www.hdl.fi/vamos/kaupungit/vamos-kuopio/'
        image_url_a = 'https://scontent-hel3-1.xx.fbcdn.net/v/t1.6435-1/p148x148/86173929_3438612102879668_4009826126615543808_n.png?_nc_cat=102&ccb=1-5&_nc_sid=1eb0c7&_nc_ohc=1v__SKINII0AX9_kIer&_nc_ht=scontent-hel3-1.xx&oh=6b7981c3af84ae7f91b9815f4ebff229&oe=616DAC91'
        url_b = 'https://www.kulttuuriareena44.fi/'
        image_url_b = 'https://po1nt.fi/wp-content/uploads/2019/09/logo-po1nt-turkoosi-xs.png'
        url_c = 'https://po1nt.fi/kuopio/nuorisotilat/petosenpinari/'
        image_url_c = 'https://po1nt.fi/wp-content/uploads/2019/09/logo-po1nt-turkoosi-xs.png'
        url_d = 'https://po1nt.fi/kuopio/nuorisotilat/jynkanmonari/'
        image_url_d = 'https://po1nt.fi/wp-content/uploads/2019/09/logo-po1nt-turkoosi-xs.png'

        test_carousel = {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": name_a,
                    "image_url": image_url_a,
                    "buttons": [{
                        "title": "Avaa",
                        "url": url_a,
                        "type": "web_url",
                    }
                    ]
                },
                    {
                        "title": name_b,
                        "image_url": image_url_b,
                        "buttons": [{
                            "title": "Avaa",
                            "url": url_b,
                            "type": "web_url",
                        }
                        ]
                    },
                    {
                        "title": name_c,
                        "image_url": image_url_c,
                        "buttons": [{
                            "title": "Avaa",
                            "url": url_c,
                            "type": "web_url",
                        }
                        ]
                    },
                    {
                        "title": name_d,
                        "image_url": image_url_d,
                        "buttons": [{
                            "title": "Avaa",
                            "url": url_d,
                            "type": "web_url",
                        }
                        ]
                    }
                ]
            }
        }

        return test_carousel

    def oulu(self):

        name_a = 'Nuorisotilojen verkkosivut'
        name_b = 'Liikuntakeskus Jatuli'
        name_c = 'Hiukkavaaratalo'
        name_d = 'Kastellin monitoimitalo'

        url_a = 'http://www.ouka.fi/oulu/nuoret/nuorisotilat'
        image_url_a = 'https://storage.googleapis.com/ouka-nuortenoulu-prod/uploads/2021/01/b31f2909-nettiresoluutio-_pjm3979.jpg'
        url_b = 'http://www.ouka.fi/oulu/liikunta-ja-ulkoilu/jatulin-liikuntakeskus'
        image_url_b = 'https://storage.googleapis.com/ouka-nuortenoulu-prod/uploads/2021/01/b31f2909-nettiresoluutio-_pjm3979.jpg'
        url_c = 'https://www.ouka.fi/oulu/hiukkavaaratalo'
        image_url_c = 'https://storage.googleapis.com/ouka-nuortenoulu-prod/uploads/2021/01/b31f2909-nettiresoluutio-_pjm3979.jpg'
        url_d = 'https://www.ouka.fi/oulu/kastellin-monitoimitalo'
        image_url_d = 'https://storage.googleapis.com/ouka-nuortenoulu-prod/uploads/2021/01/b31f2909-nettiresoluutio-_pjm3979.jpg'

        test_carousel = {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": name_a,
                    "image_url": image_url_a,
                    "buttons": [{
                        "title": "Avaa",
                        "url": url_a,
                        "type": "web_url",
                    }
                    ]
                },
                    {
                        "title": name_b,
                        "image_url": image_url_b,
                        "buttons": [{
                            "title": "Avaa",
                            "url": url_b,
                            "type": "web_url",
                        }
                        ]
                    },
                    {
                        "title": name_c,
                        "image_url": image_url_c,
                        "buttons": [{
                            "title": "Avaa",
                            "url": url_c,
                            "type": "web_url",
                        }
                        ]
                    },
                    {
                        "title": name_d,
                        "image_url": image_url_d,
                        "buttons": [{
                            "title": "Avaa",
                            "url": url_d,
                            "type": "web_url",
                        }
                        ]
                    }
                ]
            }
        }

        return test_carousel