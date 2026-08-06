import copy
import sys

# Python 3.14 compatibility patch for Django template Context.__copy__
if sys.version_info >= (3, 14):
    from django.template import context

    def _base_context_copy(self):
        obj = self.__class__.__new__(self.__class__)
        obj.dicts = [d.copy() for d in self.dicts]
        obj.autoescape = getattr(self, 'autoescape', True)
        obj.use_l10n = getattr(self, 'use_l10n', None)
        obj.use_tz = getattr(self, 'use_tz', None)
        obj.template_name = getattr(self, 'template_name', None)
        obj.template = getattr(self, 'template', None)
        if hasattr(self, 'render_context'):
            obj.render_context = copy.copy(self.render_context)
        return obj

    def _context_copy(self):
        return _base_context_copy(self)

    def _request_context_copy(self):
        obj = _base_context_copy(self)
        obj.request = getattr(self, 'request', None)
        return obj

    context.BaseContext.__copy__ = _base_context_copy
    context.Context.__copy__ = _context_copy
    context.RequestContext.__copy__ = _request_context_copy
