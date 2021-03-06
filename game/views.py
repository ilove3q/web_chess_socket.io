import json

from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from game.models import Game
from profil.models import Player
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt

# Create your views here.
@login_required
def index(request):
    return render(request, 'index.html')


# this view must be csrf exempted to be able to accept XMLHttpRequests
@csrf_exempt
def save_game(request):
    if request.method == 'POST':
        msg_obj = json.loads(request.body.decode('utf-8'))
        print(msg_obj)
        try:
            msg = Game.objects.create(white_player=msg_obj['white_player'], black_player=msg_obj['black_player'], winner = msg_obj['winner'], history = msg_obj['history'], note =msg_obj['note'] )
            msg.save()
            white = Player.objects.get(user__username = msg_obj['white_player'])
            black = Player.objects.get(user__username = msg_obj['black_player'])
            black.no_of_games += 1
            white.no_of_games += 1
            if msg_obj['winner'] == 'draw' :
                white.no_of_draw += 1
                black.no_of_draw += 1
            else :
                if white.user.username == msg_obj['winner'] :
                    white.no_of_wins += 1
                else:
                    black.no_of_wins += 1
            white.save()
            black.save()
        except Exception as ex:
            print("error saving game: %s" % ex)
        return HttpResponse("success")
    else:
        return HttpResponseRedirect('/')