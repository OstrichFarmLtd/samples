import { Component, ElementRef, NgZone, ViewChild } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  /** video要素 */
  @ViewChild( 'videoOutput' ) video: ElementRef<HTMLVideoElement>;

  /** img要素 */
  @ViewChild( 'overlay' ) overlay: ElementRef<HTMLImageElement>;

  // Angular外で発生するイベントを処理するためにNgZoneを使用
  constructor( private readonly ngZone: NgZone ) {}

  /** キャプチャ開始ボタンクリック時の処理 */
  onClickStartButton() {
    this.startCapture();
  }

  /** キャプチャ画像(のコンテナ)クリック時の処理 */
  onClickContainer( evt: MouseEvent ) {
    // ボタンの判定: 主ボタン(0)をクリックしたかの判定
    // 参考: https://developer.mozilla.org/ja/docs/Web/API/MouseEvent/button
    if ( evt.button === 0 ) {
      if ( evt.shiftKey ) {
        this.clearDiffImage();
      } else {
        this.updateDiffImage();
      }
    }
  }

  /** ビデオの情報が変わった際の処理
   * loadedmetadata, timeupdateイベントを扱う */
   onVideoUpdate( evt: any ) {
    // 適切な型情報が無いので any で受け取る
    // 参考: https://stackoverflow.com/questions/38438741/detecting-video-resolution-changes
    const width  = evt.target.videoWidth;
    const height = evt.target.videoHeight;
    if ( width && height ) {
      // 一時停止してからサイズ変更すると、チラつきが少しだけ低減する。
      this.video.nativeElement.pause();
      this.width = width;
      this.height = height;
      this.video.nativeElement.play();
    }
  }

  /** キャプチャ中かどうか */
  isCapturing: boolean = false;

  /** 画面キャプチャの開始 */
  private async startCapture() {
    if ( this.isCapturing ) {
      // 念のためのガード
      return;
    }

    // 差分画像をクリアする
    this.clearDiffImage();

    // ユーザにキャプチャする画面を選択させ、MediaStreamを取得する。
    const media = await navigator.mediaDevices.getDisplayMedia( {
      video: true,
      audio: false
    } );

    // video要素にユーザが選択したMediaStreamを設定し、再生を開始する。
    this.video.nativeElement.srcObject = media;
    this.video.nativeElement.play();

    // ユーザがキャプチャを停止したことを検知したら、初期状態に戻す。
    // 参考: https://stackoverflow.com/questions/25141080/how-to-listen-for-stop-sharing-click-in-chrome-desktopcapture-api
    const track = media.getTracks()[0];
    track.onended = () => {
      this.ngZone.run( () => {
        // track.onendedはAngularの変更検知外のイベントなので、
        // 処理結果が画面に反映されるようNgZone内で実行する。
        // 参考: https://angular.jp/guide/zone#ngzone-run-%E3%81%A8-runoutsideofangular
        this.video.nativeElement.srcObject = null;
        this.isCapturing = false;
      } );
    }

    this.isCapturing = true;
  }

  // ビデオサイズ
  width: number  = 0;
  height: number = 0;

  // 差分のベース画像のデータURI
  imageUrl: string | null = null;

  /** 差分のベース画像更新 */
  private updateDiffImage() {
    console.log('test')
    if ( !this.isCapturing ) {
      return;
    }
    const dataUrl = getImageUrl( this.video.nativeElement );
    this.imageUrl = dataUrl;
  }

  /** 差分のベース画像削除 */
  private clearDiffImage() {
    this.imageUrl = null;
  }
}

/** video要素から画像のデータURIを生成する */
function getImageUrl( video: HTMLVideoElement ) {
  // 参考: https://stackoverflow.com/questions/23745988/get-an-image-from-the-video/44325898
  const canvas = document.createElement( 'canvas' );
  const context = canvas.getContext( '2d' );
  if ( !context ) {
    throw new Error( 'Cannot get 2d context.' );
  }

  canvas.width = video.clientWidth;
  canvas.height = video.clientHeight;
  context.drawImage( video, 0, 0, canvas.width, canvas.height );
  
  return canvas.toDataURL();
}
