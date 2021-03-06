/** uri: 'https://api.flickr.com/services/rest/?',
 queryMethod: 'flickr.photos.search',
 apiKey: '7fbc4d0fd04492d32fa9a2f718c6293e'
 */

/// <reference path="fetch.d.ts" />
/// <reference path="../typings/tsd.d.ts"/>

import _ = require('lodash');
import Q = require('q');

type opt={
    elem:HTMLElement;
    uri:string;
    queryMethod:string;
    apiKey:string
}

//пришлось создать интерфейс для фото, так как ругалось на тип person внутри _.map
interface IPhoto {
    farm: number;
    id: string;
    isfamily: string;
    isfriend: string;
    ispublic: number;
    owner: string;
    title: string;
    server: string;
    secret: string;
    user?: string;
}

export class FlickrApp {
    protected elem:HTMLElement;
    protected input:HTMLInputElement;
    protected searchButton:HTMLButtonElement;
    protected imageBox:HTMLDivElement;
    protected uri:string;
    protected queryMethod:string;
    protected apiKey:string;
    protected photos:any;


    constructor(opt:opt) {
        let {elem, uri, queryMethod, apiKey}=opt;
        this.elem = elem;
        this.uri = uri;
        this.queryMethod = queryMethod;
        this.apiKey = apiKey;
        this.input = this.elem.querySelector('.flickr-search-input') as HTMLInputElement;
        this.imageBox = this.elem.querySelector('.image-area') as HTMLDivElement;
        this.searchButton = this.elem.querySelector('.flickr-search-button') as HTMLButtonElement;
        this.searchButton.addEventListener('click', _.debounce(this.search.bind(this, this.render.bind(this))))
    }

    protected render(body:any):void {
        this.photos = body.photos.photo;
        this.photos = _.sortBy(body.photos.photo, ['title']); //сортировка масива фото

        /** Вопрос, можно ли этот кусок, в котором мы отправляем еще один запрос перенести в метод getPhotos()? */
        //пробегаемся по всем Photos и делаем еще один запрос на получение Имени пользователя
        Q.all(_.map(this.photos, (photo:IPhoto) => {
            let url = new Request(`${this.uri}method=flickr.people.getInfo&
                api_key=${this.apiKey}&user_id=${photo.owner}&format=json&nojsoncallback=1`);
            return fetch(url).then((response:Response):PromiseLike<any> => {
                return response.json();
            });
          })).then((users:any):void => {
              let content = ``;
              this.photos = _.map(this.photos, (photo:IPhoto, i:number):IPhoto => {
                  photo.owner = users[i].person.username._content;
                  return photo;
              });
              for (let photo of this.photos) {
                  content += `<div  class='image-box'>
                        <img src='https://farm${photo.farm}.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg' />
                        <p><span><strong>${photo.owner}: </strong></span>${photo.title}</p>
                        </div>`;
              }
              this.imageBox.innerHTML = content;
          });
    }

    protected search(cb:(body:any)=>any):void {
        if (!this.input.value) {
            return;
        }
        let text = this.input.value;
        let url = new Request(`${this.uri}method=${this.queryMethod}&
        api_key=${this.apiKey}&text=${text}&page=1&format=json&nojsoncallback=1`);
        this.getPhotos(url, cb)
    }

    protected getPhotos(input:string|Request, cb:(body:any)=>any):void {
        fetch(input)
            .then((response:Response):PromiseLike<any> => {
                return response.json();
            }).then(cb)
    }
}