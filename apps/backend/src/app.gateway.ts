
import { MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';


@WebSocketGateway({ namespace: 'app', cors: true })
export class AppGateway {

    @SubscribeMessage("app-test")
    handleAppTest(@MessageBody() data: string): string {
        console.log("收到消息", data);
        return data;
    }


    
}
