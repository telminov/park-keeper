# coding: utf-8
from project.settings_default import *

# must be agreed with park-workers
SECRET_KEY = '321'
DEBUG = False

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join('/data/', 'db.sqlite3'),
    }
}

ALLOWED_HOSTS = ['*']
WEB_SOCKET_SERVER_PORT = 8081

MONGODB = {
    'NAME': 'parkkeeper',
    'HOST': 'mongo3',
    'PORT': 27017,
    'USER': None,
    'PASSWORD': None,
}

import mongoengine
mongoengine.connect(MONGODB['NAME'], host='mongodb://%s:%s/%s' % (MONGODB['HOST'], MONGODB.get('PORT', 27017), MONGODB['NAME']))
